import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

import { Teams } from './teams';
import { Serie } from '../../poules/poules';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [...provideTranslocoTesting()],
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
    fixture.componentRef.setInput('teams', [{ ref: null!, name: 'Team A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="add-team-button"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="edit-team-button"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="delete-team-button"]')).toBeNull();
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

    const editButtons = fixture.nativeElement.querySelectorAll('[data-testid="edit-team-button"]');
    const deleteButtons = fixture.nativeElement.querySelectorAll(
      '[data-testid="delete-team-button"]',
    );

    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
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

  it('should show view team button for all users', async () => {
    fixture.componentRef.setInput('teams', [{ ref: { id: '1' } as never, name: 'Équipe A' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    const viewButtons = fixture.nativeElement.querySelectorAll('[data-testid="view-team-button"]');
    expect(viewButtons.length).toBe(1);
  });

  it('should open team detail dialog when onViewTeam is called', () => {
    const team = { ref: { id: '1' } as never, name: 'Équipe A' };
    component.onViewTeam(team);

    expect(component.teamDetailVisible()).toBe(true);
    expect(component.selectedTeam()).toEqual(team);
  });

  it('should compute teamUpcomingGames for selected team', () => {
    const teamRef = { id: 'team1' } as DocumentReference;
    const otherRef = { id: 'team2' } as DocumentReference;
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const series: Serie[] = [
      {
        ref: { id: 's1' } as DocumentReference,
        name: 'Série 1',
        poules: [
          {
            ref: { id: 'p1' } as DocumentReference,
            name: 'Poule A',
            refTeams: [teamRef, otherRef],
            games: [
              {
                ref: { id: 'g1' } as DocumentReference,
                refTeam1: teamRef,
                refTeam2: otherRef,
                date: futureDate,
              },
            ],
          },
        ],
      },
    ];

    fixture.componentRef.setInput('teams', [
      { ref: teamRef, name: 'Équipe A' },
      { ref: otherRef, name: 'Équipe B' },
    ]);
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    component.selectedTeam.set({ ref: teamRef, name: 'Équipe A' });

    expect(component.teamUpcomingGames().length).toBe(1);
    expect(component.teamUpcomingGames()[0].team1Name).toBe('Équipe A');
    expect(component.teamUpcomingGames()[0].team2Name).toBe('Équipe B');
  });

  it('should compute teamPlayedGames for selected team', () => {
    const teamRef = { id: 'team1' } as DocumentReference;
    const otherRef = { id: 'team2' } as DocumentReference;
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const series: Serie[] = [
      {
        ref: { id: 's1' } as DocumentReference,
        name: 'Série 1',
        poules: [
          {
            ref: { id: 'p1' } as DocumentReference,
            name: 'Poule A',
            refTeams: [teamRef, otherRef],
            games: [
              {
                ref: { id: 'g1' } as DocumentReference,
                refTeam1: teamRef,
                refTeam2: otherRef,
                scoreTeam1: 3,
                scoreTeam2: 1,
                date: pastDate,
              },
            ],
          },
        ],
      },
    ];

    fixture.componentRef.setInput('teams', [
      { ref: teamRef, name: 'Équipe A' },
      { ref: otherRef, name: 'Équipe B' },
    ]);
    fixture.componentRef.setInput('series', series);
    fixture.detectChanges();

    component.selectedTeam.set({ ref: teamRef, name: 'Équipe A' });

    expect(component.teamPlayedGames().length).toBe(1);
    expect(component.teamPlayedGames()[0].scoreTeam1).toBe(3);
    expect(component.teamPlayedGames()[0].scoreTeam2).toBe(1);
  });
});
