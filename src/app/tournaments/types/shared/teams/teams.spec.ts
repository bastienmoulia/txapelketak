import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { provideRouter } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';
import { vi } from 'vitest';

import { Teams } from './teams';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;
  let mockDialogService: { open: ReturnType<typeof vi.fn> };
  let mockOnClose: { subscribe: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockOnClose = { subscribe: vi.fn() };
    mockDialogService = { open: vi.fn().mockReturnValue({ onClose: mockOnClose }) };

    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [...provideTranslocoTesting(), provideRouter([]), ConfirmationService],
    })
      .overrideComponent(Teams, {
        set: {
          providers: [
            { provide: DialogService, useValue: mockDialogService },
            ConfirmationService,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Teams);
    fixture.componentRef.setInput('teams', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sortable column headers for Nom, Série and Poule', async () => {
    fixture.componentRef.setInput('teams', [{ ref: { id: '1' } as never, name: 'Team A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const sortIcons = Array.from(
      fixture.nativeElement.querySelectorAll('p-sorticon'),
    ) as HTMLElement[];

    expect(sortIcons.length).toBe(3);
  });

  it('should display serieName and pouleName for teams with context', async () => {
    fixture.componentRef.setInput('teams', [
      { ref: { id: '1' } as never, name: 'Team A', serieName: 'Série 1', pouleName: 'Poule A' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const cells = Array.from(fixture.nativeElement.querySelectorAll('td')) as HTMLElement[];
    const cellTexts = cells.map((c) => c.textContent?.trim());

    expect(cellTexts).toContain('Team A');
    expect(cellTexts).toContain('Série 1');
    expect(cellTexts).toContain('Poule A');
  });

  it('should not render admin actions without admin role', async () => {
    fixture.componentRef.setInput('teams', [{ ref: { id: '1' } as never, name: 'Team A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="add-team-button"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="edit-team-button"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="delete-team-button"]')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="view-team-games-button"]'),
    ).not.toBeNull();
  });

  it('should render admin actions with admin role', async () => {
    fixture.componentRef.setInput('role', 'admin');
    fixture.componentRef.setInput('teams', [
      { ref: { id: '1' } as never, name: 'Équipe A' },
      { ref: { id: '2' } as never, name: 'Équipe B' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="add-team-button"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="add-teams-bulk-button"]'),
    ).not.toBeNull();

    const viewGamesButtons = fixture.nativeElement.querySelectorAll(
      '[data-testid="view-team-games-button"]',
    );
    const editButtons = fixture.nativeElement.querySelectorAll('[data-testid="edit-team-button"]');
    const deleteButtons = fixture.nativeElement.querySelectorAll(
      '[data-testid="delete-team-button"]',
    );

    expect(viewGamesButtons.length).toBe(2);
    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('should open add team dialog when onAddTeam is triggered', () => {
    component.onAddTeam();
    expect(mockDialogService.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ isEditing: false }) }),
    );
  });

  it('should open edit team dialog when onEditTeam is triggered', () => {
    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onEditTeam(team);
    expect(mockDialogService.open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ isEditing: true }) }),
    );
  });

  it('should open bulk dialog when onAddTeams is triggered', () => {
    component.onAddTeams();
    expect(mockDialogService.open).toHaveBeenCalled();
  });

  it('should emit saveTeams when bulk dialog closes with a result', () => {
    const emitted: { ref: unknown; name: string }[][] = [];
    component.saveTeams.subscribe((teams) => emitted.push(teams));

    let closeCallback: ((result: unknown) => void) | undefined;
    mockOnClose.subscribe.mockImplementation((cb: (result: unknown) => void) => {
      closeCallback = cb;
    });

    const teams = [
      { ref: { id: '1' } as never, name: 'Équipe A' },
      { ref: { id: '2' } as never, name: 'Équipe B' },
    ];

    component.onAddTeams();
    closeCallback?.(teams);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(teams);
  });
  it('should emit saveTeam when dialog closes with a result', () => {
    const emitted: { ref: unknown; name: string }[] = [];
    component.saveTeam.subscribe((team) => emitted.push(team));

    let closeCallback: ((result: unknown) => void) | undefined;
    mockOnClose.subscribe.mockImplementation((cb: (result: unknown) => void) => {
      closeCallback = cb;
    });

    component.onAddTeam();
    closeCallback?.({ ref: { id: '1' } as never, name: 'New Team' });

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('New Team');
  });

  it('should not emit saveTeam when dialog closes without a result (cancelled)', () => {
    const emitted: unknown[] = [];
    component.saveTeam.subscribe((team) => emitted.push(team));

    let closeCallback: ((result: unknown) => void) | undefined;
    mockOnClose.subscribe.mockImplementation((cb: (result: unknown) => void) => {
      closeCallback = cb;
    });

    component.onAddTeam();
    closeCallback?.(undefined);

    expect(emitted.length).toBe(0);
  });

  it('should emit deleteTeam when confirmation is accepted', () => {
    const emitted: { ref: unknown; name: string }[] = [];
    component.deleteTeam.subscribe((team) => emitted.push(team));

    // Spy on the component-level ConfirmationService instance
    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation(
      (config: { accept?: () => void }) => {
        config.accept?.();
      },
    );

    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(confirmService.confirm).toHaveBeenCalled();
    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(team);
  });

  it('should not emit deleteTeam when confirmation is rejected', () => {
    const emitted: unknown[] = [];
    component.deleteTeam.subscribe((team) => emitted.push(team));

    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation(() => {
      // reject = do nothing (accept is never called)
    });

    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(emitted.length).toBe(0);
  });
});
