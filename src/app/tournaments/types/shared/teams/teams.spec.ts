import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { provideRouter } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';
import { patchState } from '@ngrx/signals';
import { vi } from 'vitest';

import { Teams } from './teams';
import { PoulesStore } from '../../../../store/poules.store';
import { AuthStore } from '../../../../store/auth.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;
  let mockDialogService: { open: ReturnType<typeof vi.fn> };
  let mockOnClose: { subscribe: ReturnType<typeof vi.fn> };
  let mockTournamentActions: {
    saveTeam: ReturnType<typeof vi.fn>;
    saveTeams: ReturnType<typeof vi.fn>;
    deleteTeam: ReturnType<typeof vi.fn>;
  };
  let poulesStore: InstanceType<typeof PoulesStore>;
  let authStore: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    mockOnClose = { subscribe: vi.fn() };
    mockDialogService = { open: vi.fn().mockReturnValue({ onClose: mockOnClose }) };
    mockTournamentActions = { saveTeam: vi.fn(), saveTeams: vi.fn(), deleteTeam: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [
        ...provideTranslocoTesting(),
        provideRouter([]),
        ConfirmationService,
        { provide: TournamentActionsService, useValue: mockTournamentActions },
      ],
    })
      .overrideComponent(Teams, {
        set: {
          providers: [{ provide: DialogService, useValue: mockDialogService }, ConfirmationService],
        },
      })
      .compileComponents();

    poulesStore = TestBed.inject(PoulesStore);
    authStore = TestBed.inject(AuthStore);

    fixture = TestBed.createComponent(Teams);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have sortable column headers for Nom, Série and Poule', async () => {
    patchState(poulesStore, { teams: [{ ref: { id: '1' } as never, name: 'Team A' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    const sortIcons = Array.from(
      fixture.nativeElement.querySelectorAll('p-sorticon'),
    ) as HTMLElement[];

    expect(sortIcons.length).toBe(3);
  });

  it('should display serieName and pouleName for teams with context', async () => {
    patchState(poulesStore, {
      teams: [{ ref: { id: '1' } as never, name: 'Team A' }],
      series: [
        {
          ref: { id: 's1' } as never,
          name: 'Série 1',
          poules: [
            {
              ref: { id: 'p1' } as never,
              name: 'Poule A',
              refTeams: [{ id: '1' } as never],
              games: [],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const cells = Array.from(fixture.nativeElement.querySelectorAll('td')) as HTMLElement[];
    const cellTexts = cells.map((c) => c.textContent?.trim());

    expect(cellTexts).toContain('Team A');
    expect(cellTexts).toContain('Série 1');
    expect(cellTexts).toContain('Poule A');
  });

  it('should not render admin actions without admin role', async () => {
    patchState(poulesStore, { teams: [{ ref: { id: '1' } as never, name: 'Team A' }] });
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
    authStore.setUser({ role: 'admin' } as never);
    patchState(poulesStore, {
      teams: [
        { ref: { id: '1' } as never, name: 'Équipe A' },
        { ref: { id: '2' } as never, name: 'Équipe B' },
      ],
    });
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

    expect(viewGamesButtons.length).toBe(2);
    expect(editButtons.length).toBe(2);
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

  it('should call tournamentActions.saveTeams when bulk dialog closes with a result', () => {
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

    expect(mockTournamentActions.saveTeams).toHaveBeenCalledWith(teams);
  });

  it('should call tournamentActions.saveTeam when dialog closes with a result', () => {
    let closeCallback: ((result: unknown) => void) | undefined;
    mockOnClose.subscribe.mockImplementation((cb: (result: unknown) => void) => {
      closeCallback = cb;
    });

    component.onAddTeam();
    closeCallback?.({ ref: { id: '1' } as never, name: 'New Team' });

    expect(mockTournamentActions.saveTeam).toHaveBeenCalledWith({
      ref: { id: '1' } as never,
      name: 'New Team',
    });
  });

  it('should not call tournamentActions.saveTeam when dialog closes without a result (cancelled)', () => {
    let closeCallback: ((result: unknown) => void) | undefined;
    mockOnClose.subscribe.mockImplementation((cb: (result: unknown) => void) => {
      closeCallback = cb;
    });

    component.onAddTeam();
    closeCallback?.(undefined);

    expect(mockTournamentActions.saveTeam).not.toHaveBeenCalled();
  });

  it('should call tournamentActions.deleteTeam when confirmation is accepted', () => {
    // Spy on the component-level ConfirmationService instance
    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation((config: { accept?: () => void }) => {
      config.accept?.();
    });

    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(confirmService.confirm).toHaveBeenCalled();
    expect(mockTournamentActions.deleteTeam).toHaveBeenCalledWith(team);
  });

  it('should not call tournamentActions.deleteTeam when confirmation is rejected', () => {
    const confirmService = fixture.debugElement.injector.get(ConfirmationService);
    vi.spyOn(confirmService, 'confirm').mockImplementation(() => {
      // reject = do nothing (accept is never called)
    });

    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(mockTournamentActions.deleteTeam).not.toHaveBeenCalled();
  });

  it('should show comment button for admin when team has comment', async () => {
    authStore.setUser({ role: 'admin' } as never);
    patchState(poulesStore, {
      teams: [
        { ref: { id: '1' } as never, name: 'Équipe A', comment: 'A note about this team' },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const commentButton = fixture.nativeElement.querySelector('[data-testid="team-comment-button"]');
    expect(commentButton).not.toBeNull();
  });

  it('should show comment button for organizer when team has comment', async () => {
    authStore.setUser({ role: 'organizer' } as never);
    patchState(poulesStore, {
      teams: [
        { ref: { id: '1' } as never, name: 'Équipe A', comment: 'A note about this team' },
      ],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const commentButton = fixture.nativeElement.querySelector('[data-testid="team-comment-button"]');
    expect(commentButton).not.toBeNull();
  });

  it('should not show comment button when team has no comment', async () => {
    authStore.setUser({ role: 'admin' } as never);
    patchState(poulesStore, {
      teams: [{ ref: { id: '1' } as never, name: 'Équipe A' }],
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const commentButton = fixture.nativeElement.querySelector('[data-testid="team-comment-button"]');
    expect(commentButton).toBeNull();
  });
});
