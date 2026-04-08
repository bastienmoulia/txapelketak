import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { provideRouter, Router } from '@angular/router';

import { Teams } from './teams';
import { GAMES_TEAM_FILTER_QUERY_PARAM } from '../games/games';
import { POULES_TAB_QUERY_PARAM } from '../../poules/poules.route';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [...provideTranslocoTesting(), provideRouter([])],
    }).compileComponents();

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
    fixture.componentRef.setInput('teams', [{ ref: null!, name: 'Team A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const sortIcons = Array.from(
      fixture.nativeElement.querySelectorAll('p-sorticon'),
    ) as HTMLElement[];

    expect(sortIcons.length).toBe(3);
  });

  it('should display serieName and pouleName for teams with context', async () => {
    fixture.componentRef.setInput('teams', [
      { ref: null!, name: 'Team A', serieName: 'Série 1', pouleName: 'Poule A' },
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
    expect(fixture.nativeElement.querySelector('[data-testid="add-teams-bulk-button"]')).not.toBeNull();

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

  it('should navigate to games tab with teamId when view games button is clicked', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const team = { ref: { id: 'team-42' } as never, name: 'Équipe A' };
    component.onViewTeamGames(team);

    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: {
          [POULES_TAB_QUERY_PARAM]: 'games',
          [GAMES_TEAM_FILTER_QUERY_PARAM]: 'team-42',
        },
        queryParamsHandling: 'merge',
      }),
    );
  });

  it('should open dialog when add team is triggered', () => {
    component.onAddTeam();

    expect(component.visible()).toBe(true);
    expect(component.isEditing()).toBe(false);
  });

  it('should open dialog in edit mode when edit is triggered', () => {
    const team = { ref: { id: '1' } as never, name: 'Équipe A' };

    component.onEditTeam(team);

    expect(component.visible()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.team()).toEqual(team);
  });

  it('should emit saveTeam when saving a valid team', () => {
    const emitted: { ref: unknown; name: string }[] = [];
    component.saveTeam.subscribe((team) => emitted.push(team));

    component.onAddTeam();
    component.team.set({ ref: null!, name: 'New Team' });
    component.onSaveTeam();

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('New Team');
    expect(component.visible()).toBe(false);
  });

  it('should show confirmation dialog and emit delete on confirm', () => {
    const emitted: { ref: unknown; name: string }[] = [];
    component.deleteTeam.subscribe((team) => emitted.push(team));

    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(component.deleteConfirmVisible()).toBe(true);
    expect(component.pendingDeleteTeam()).toEqual(team);
    expect(emitted.length).toBe(0);

    component.onConfirmDeleteTeam();

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(team);
    expect(component.deleteConfirmVisible()).toBe(false);
    expect(component.pendingDeleteTeam()).toBeNull();
  });

  it('should cancel deletion without emitting delete event', () => {
    const emitted: { ref: unknown; name: string }[] = [];
    component.deleteTeam.subscribe((team) => emitted.push(team));

    component.onDeleteTeam({ ref: { id: '1' } as never, name: 'Équipe A' });
    component.onCancelDeleteTeam();

    expect(emitted.length).toBe(0);
    expect(component.deleteConfirmVisible()).toBe(false);
    expect(component.pendingDeleteTeam()).toBeNull();
  });

  it('should emit saveTeams with parsed names from bulk text', () => {
    const emitted: { ref: unknown; name: string }[][] = [];
    component.saveTeams.subscribe((teams) => emitted.push(teams));

    component.bulkText.set('Team A\nTeam B\n\nTeam C');
    component.onSaveTeams();

    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(3);
    expect(emitted[0].map((team) => team.name)).toEqual(['Team A', 'Team B', 'Team C']);
  });
});
