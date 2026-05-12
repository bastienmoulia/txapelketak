import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { DocumentReference } from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import { vi } from 'vitest';

import { Phases } from './phases';
import { Serie } from '../../poules/poules';
import { Team } from '../teams/teams';
import { PoulesStore } from '../../../../store/poules.store';
import { AuthStore } from '../../../../store/auth.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject } from 'rxjs';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('Phases', () => {
  let component: Phases;
  let fixture: ComponentFixture<Phases>;
  let poulesStore: InstanceType<typeof PoulesStore>;
  let mockTournamentActions: Record<string, ReturnType<typeof vi.fn>>;
  let dialogServiceMock: { open: ReturnType<typeof vi.fn> };
  let messageServiceMock: {
    add: ReturnType<typeof vi.fn>;
    messageObserver: Subject<unknown>;
    clearObserver: Subject<unknown>;
  };

  beforeEach(async () => {
    mockTournamentActions = {
      saveSerie: vi.fn(),
      deleteSerie: vi.fn(),
      savePoule: vi.fn(),
      deletePoule: vi.fn(),
      addTeamToPoule: vi.fn(),
      removeTeamFromPoule: vi.fn(),
      addTeamToPouleSilent: vi.fn(),
      removeTeamFromPouleSilent: vi.fn(),
    };

    dialogServiceMock = { open: vi.fn() };
    messageServiceMock = {
      add: vi.fn(),
      messageObserver: new Subject(),
      clearObserver: new Subject(),
    };

    await TestBed.configureTestingModule({
      imports: [Phases],
      providers: [
        ...provideTranslocoTesting(),
        { provide: TournamentActionsService, useValue: mockTournamentActions },
      ],
    })
      .overrideComponent(Phases, {
        set: {
          providers: [
            { provide: DialogService, useValue: dialogServiceMock },
            ConfirmationService,
            { provide: MessageService, useValue: messageServiceMock },
          ],
        },
      })
      .compileComponents();

    poulesStore = TestBed.inject(PoulesStore);

    fixture = TestBed.createComponent(Phases);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('standings computation', () => {
    const teamARef = createRef('teamA');
    const teamBRef = createRef('teamB');
    const teamCRef = createRef('teamC');
    const serieRef = createRef('serie1');
    const pouleRef = createRef('poule1');

    const teams: Team[] = [
      { ref: teamARef, name: 'Team A' },
      { ref: teamBRef, name: 'Team B' },
      { ref: teamCRef, name: 'Team C' },
    ];

    function buildSeries(games: Serie['poules'][0]['games']): Serie[] {
      return [
        {
          ref: serieRef,
          name: 'Serie 1',
          poules: [
            {
              ref: pouleRef,
              name: 'Poule 1',
              refTeams: [teamARef, teamBRef, teamCRef],
              games,
            },
          ],
        },
      ];
    }

    it('should count played and won games correctly', () => {
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 3,
          scoreTeam2: 1,
        },
        {
          ref: createRef('g2'),
          refTeam1: teamARef,
          refTeam2: teamCRef,
          scoreTeam1: 2,
          scoreTeam2: 4,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const poule = component.sortedSeries()[0].poules[0];
      const standingA = poule.standings.find((s) => s.ref.id === 'teamA')!;
      expect(standingA.played).toBe(2);
      expect(standingA.won).toBe(1);

      const standingB = poule.standings.find((s) => s.ref.id === 'teamB')!;
      expect(standingB.played).toBe(1);
      expect(standingB.won).toBe(0);
    });

    it('should count points in losses correctly', () => {
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 5,
          scoreTeam2: 8,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const poule = component.sortedSeries()[0].poules[0];
      // Team A lost with 5 points
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.pointsInLosses).toBe(5);
      // Team B won, no points in losses
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.pointsInLosses).toBe(0);
    });

    it('should count points conceded correctly', () => {
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 5,
          scoreTeam2: 8,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const poule = component.sortedSeries()[0].poules[0];
      // Team A conceded 8 points (Team B scored 8)
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.pointsConceded).toBe(8);
      // Team B conceded 5 points
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.pointsConceded).toBe(5);
    });

    it('should not count unfinished games (missing score)', () => {
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const poule = component.sortedSeries()[0].poules[0];
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.played).toBe(0);
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.played).toBe(0);
    });

    it('should sort standings by wins descending, then points in losses descending, then points conceded ascending', () => {
      // A beats B: A gets 1 win, B loses with 5 pts in losses
      // A beats C: A gets 2 wins, C loses with 3 pts in losses
      // Team A: played=2, won=2, pointsInLosses=0
      // Team B: played=1, won=0, pointsInLosses=5
      // Team C: played=1, won=0, pointsInLosses=3
      // Expected order: A (2W), B (0W, 5PL), C (0W, 3PL)
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 8,
          scoreTeam2: 5,
        },
        {
          ref: createRef('g2'),
          refTeam1: teamARef,
          refTeam2: teamCRef,
          scoreTeam1: 6,
          scoreTeam2: 3,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const standings = component.sortedSeries()[0].poules[0].standings;
      expect(standings[0].ref.id).toBe('teamA'); // 2 wins
      expect(standings[1].ref.id).toBe('teamB'); // 0 wins, 5 pts in losses
      expect(standings[2].ref.id).toBe('teamC'); // 0 wins, 3 pts in losses
    });

    it('should sort by points conceded ascending when wins and points in losses are tied', () => {
      // Team B: 0 wins, 0 points in losses, 6 conceded
      // Team C: 0 wins, 0 points in losses, 7 conceded
      const series = buildSeries([
        {
          ref: createRef('g1'),
          refTeam1: teamBRef,
          refTeam2: teamCRef,
          scoreTeam1: 0,
          scoreTeam2: 0,
        },
      ]);
      patchState(poulesStore, { teams: teams });
      patchState(poulesStore, { series: series });
      fixture.detectChanges();

      const standings = component.sortedSeries()[0].poules[0].standings;
      const standingB = standings.find((s) => s.ref.id === 'teamB')!;
      const standingC = standings.find((s) => s.ref.id === 'teamC')!;
      // Both have 0 wins, 0 points in losses, 0 conceded -> tied, order is stable
      expect(standingB.pointsConceded).toBe(0);
      expect(standingC.pointsConceded).toBe(0);
    });
  });

  describe('empty poule display', () => {
    const serieRef = createRef('serie1');
    const pouleRef = createRef('poule1');

    function buildEmptySeries(): Serie[] {
      return [
        {
          ref: serieRef,
          name: 'Serie 1',
          poules: [
            {
              ref: pouleRef,
              name: 'Poule Vide',
              refTeams: [],
              games: [],
            },
          ],
        },
      ];
    }

    it('should not show coverage message for empty poule', async () => {
      patchState(poulesStore, { teams: [] });
      patchState(poulesStore, { series: buildEmptySeries() });
      patchState(TestBed.inject(AuthStore), { currentUser: { role: 'admin' } as any });
      fixture.detectChanges();
      await fixture.whenStable();

      const successMsg = fixture.nativeElement.querySelector(
        '[data-testid="poule-games-coverage-success"]',
      );
      const errorMsg = fixture.nativeElement.querySelector(
        '[data-testid="poule-games-coverage-error"]',
      );
      expect(successMsg).toBeNull();
      expect(errorMsg).toBeNull();
    });

    it('should not show standings table for empty poule', async () => {
      patchState(poulesStore, { teams: [] });
      patchState(poulesStore, { series: buildEmptySeries() });
      fixture.detectChanges();
      await fixture.whenStable();

      const table = fixture.nativeElement.querySelector('.standings-table');
      expect(table).toBeNull();
    });
  });

  describe('game coverage helpers', () => {
    const teamARef = createRef('teamA');
    const teamBRef = createRef('teamB');
    const teamCRef = createRef('teamC');

    it('should compute expected round-robin games count', () => {
      const poule = {
        ref: createRef('p1'),
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef, teamCRef],
        games: [],
      };

      expect(component.getExpectedGamesCount(poule)).toBe(3);
    });

    it('should compute covered games count using unique team pairs', () => {
      const removedTeamRef = createRef('teamRemoved');
      const poule = {
        ref: createRef('p1'),
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef, teamCRef],
        games: [
          { ref: createRef('g1'), refTeam1: teamARef, refTeam2: teamBRef },
          { ref: createRef('g2'), refTeam1: teamBRef, refTeam2: teamARef },
          { ref: createRef('g3'), refTeam1: teamARef, refTeam2: teamCRef },
          { ref: createRef('g4'), refTeam1: teamARef, refTeam2: removedTeamRef },
        ],
      };

      expect(component.getCoveredGamesCount(poule)).toBe(2);
    });

    it('should report complete round-robin when all pairs exist', () => {
      const poule = {
        ref: createRef('p1'),
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef, teamCRef],
        games: [
          { ref: createRef('g1'), refTeam1: teamARef, refTeam2: teamBRef },
          { ref: createRef('g2'), refTeam1: teamARef, refTeam2: teamCRef },
          { ref: createRef('g3'), refTeam1: teamBRef, refTeam2: teamCRef },
        ],
      };

      expect(component.hasCompleteRoundRobin(poule)).toBe(true);
    });

    it('should report incomplete round-robin when a pair is missing', () => {
      const poule = {
        ref: createRef('p1'),
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef, teamCRef],
        games: [
          { ref: createRef('g1'), refTeam1: teamARef, refTeam2: teamBRef },
          { ref: createRef('g2'), refTeam1: teamARef, refTeam2: teamCRef },
        ],
      };

      expect(component.hasCompleteRoundRobin(poule)).toBe(false);
    });

    it('should provide tooltip with missing matchups list', () => {
      patchState(poulesStore, {
        teams: [
          { ref: teamARef, name: 'Team A' },
          { ref: teamBRef, name: 'Team B' },
          { ref: teamCRef, name: 'Team C' },
        ],
      });
      fixture.detectChanges();

      const poule = {
        ref: createRef('p1'),
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef, teamCRef],
        games: [{ ref: createRef('g1'), refTeam1: teamARef, refTeam2: teamBRef }],
      };

      const tooltip = component.getMissingGamesTooltip(poule);
      expect(tooltip).toContain('Team A contre Team C');
      expect(tooltip).toContain('Team B contre Team C');
    });
  });

  describe('poule team sync on edit', () => {
    it('should add and remove teams based on dialog selection and show grouped toast', async () => {
      const serieRef = createRef('serie1');
      const pouleRef = createRef('poule1');
      const teamARef = createRef('teamA');
      const teamBRef = createRef('teamB');
      const teamCRef = createRef('teamC');

      const poule = {
        ref: pouleRef,
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef],
        games: [],
      };

      const close$ = new Subject<
        | {
            serieRef: DocumentReference;
            name: string;
            ref?: DocumentReference;
            teamRefs?: DocumentReference[];
          }
        | { action: 'delete' }
        | undefined
      >();

      dialogServiceMock.open.mockReturnValue({ onClose: close$ });

      component.onEditPoule(serieRef, poule);

      close$.next({
        serieRef,
        name: 'Poule 1',
        ref: pouleRef,
        teamRefs: [teamBRef, teamCRef],
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(mockTournamentActions.savePoule).toHaveBeenCalledWith({
        serieRef,
        name: 'Poule 1',
        ref: pouleRef,
      });
      expect(mockTournamentActions.addTeamToPouleSilent).toHaveBeenCalledWith({
        poule,
        teamRef: teamCRef,
      });
      expect(mockTournamentActions.removeTeamFromPouleSilent).toHaveBeenCalledWith({
        poule,
        teamRef: teamARef,
      });
      expect(messageServiceMock.add).toHaveBeenCalledTimes(1);
      expect(messageServiceMock.add).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success' }),
      );
    });

    it('should not show grouped toast when team list did not change', async () => {
      const serieRef = createRef('serie1');
      const pouleRef = createRef('poule1');
      const teamARef = createRef('teamA');
      const teamBRef = createRef('teamB');

      const poule = {
        ref: pouleRef,
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef],
        games: [],
      };

      const close$ = new Subject<
        | {
            serieRef: DocumentReference;
            name: string;
            ref?: DocumentReference;
            teamRefs?: DocumentReference[];
          }
        | { action: 'delete' }
        | undefined
      >();

      dialogServiceMock.open.mockReturnValue({ onClose: close$ });

      component.onEditPoule(serieRef, poule);

      close$.next({
        serieRef,
        name: 'Poule 1',
        ref: pouleRef,
        teamRefs: [teamARef, teamBRef],
      });

      await Promise.resolve();
      await Promise.resolve();

      expect(mockTournamentActions.addTeamToPouleSilent).not.toHaveBeenCalled();
      expect(mockTournamentActions.removeTeamFromPouleSilent).not.toHaveBeenCalled();
      expect(messageServiceMock.add).not.toHaveBeenCalled();
    });
  });
});
