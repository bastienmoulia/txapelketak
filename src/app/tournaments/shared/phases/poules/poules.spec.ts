import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { Serie } from '../../../poules.model';
import { Team } from '../../teams/teams';
import { Poules } from './poules';
import type { SavePouleEvent } from '../phases';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('Poules', () => {
  let component: Poules;
  let fixture: ComponentFixture<Poules>;
  let poulesStore: InstanceType<typeof PoulesStore>;
  let authStore: InstanceType<typeof AuthStore>;
  let mockTournamentActions: {
    savePoule: ReturnType<typeof vi.fn>;
    deletePoule: ReturnType<typeof vi.fn>;
    addTeamToPouleSilent: ReturnType<typeof vi.fn>;
    removeTeamFromPouleSilent: ReturnType<typeof vi.fn>;
  };
  let dialogServiceMock: { open: ReturnType<typeof vi.fn> };
  let messageServiceMock: {
    add: ReturnType<typeof vi.fn>;
    messageObserver: Subject<unknown>;
    clearObserver: Subject<unknown>;
  };

  const serieRef = createRef('serie1');

  beforeEach(async () => {
    mockTournamentActions = {
      savePoule: vi.fn(),
      deletePoule: vi.fn(),
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
      imports: [Poules],
      providers: [
        ...provideTranslocoTesting(),
        { provide: TournamentActionsService, useValue: mockTournamentActions },
        { provide: DialogService, useValue: dialogServiceMock },
        ConfirmationService,
        { provide: MessageService, useValue: messageServiceMock },
      ],
    }).compileComponents();

    poulesStore = TestBed.inject(PoulesStore);
    authStore = TestBed.inject(AuthStore);

    fixture = TestBed.createComponent(Poules);
    fixture.componentRef.setInput('serieRef', serieRef);
    fixture.componentRef.setInput('poules', []);
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
    const pouleRef = createRef('poule1');

    const teams: Team[] = [
      { ref: teamARef, name: 'Team A' },
      { ref: teamBRef, name: 'Team B' },
      { ref: teamCRef, name: 'Team C' },
    ];

    function buildPoules(games: Serie['poules'][0]['games']) {
      return [
        {
          ref: pouleRef,
          name: 'Poule 1',
          refTeams: [teamARef, teamBRef, teamCRef],
          games,
        },
      ];
    }

    it('should count played and won games correctly', () => {
      const poules = buildPoules([
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
      poulesStore.patchTeams(teams);
      fixture.componentRef.setInput('poules', poules);
      fixture.detectChanges();

      const poule = component.sortedPoules()[0];
      const standingA = poule.standings.find((s) => s.ref.id === 'teamA')!;
      expect(standingA.played).toBe(2);
      expect(standingA.won).toBe(1);

      const standingB = poule.standings.find((s) => s.ref.id === 'teamB')!;
      expect(standingB.played).toBe(1);
      expect(standingB.won).toBe(0);
    });

    it('should count points in losses correctly', () => {
      const poules = buildPoules([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 5,
          scoreTeam2: 8,
        },
      ]);
      poulesStore.patchTeams(teams);
      fixture.componentRef.setInput('poules', poules);
      fixture.detectChanges();

      const poule = component.sortedPoules()[0];
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.pointsInLosses).toBe(5);
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.pointsInLosses).toBe(0);
    });

    it('should count points conceded correctly', () => {
      const poules = buildPoules([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
          scoreTeam1: 5,
          scoreTeam2: 8,
        },
      ]);
      poulesStore.patchTeams(teams);
      fixture.componentRef.setInput('poules', poules);
      fixture.detectChanges();

      const poule = component.sortedPoules()[0];
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.pointsConceded).toBe(8);
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.pointsConceded).toBe(5);
    });

    it('should not count unfinished games', () => {
      const poules = buildPoules([
        {
          ref: createRef('g1'),
          refTeam1: teamARef,
          refTeam2: teamBRef,
        },
      ]);
      poulesStore.patchTeams(teams);
      fixture.componentRef.setInput('poules', poules);
      fixture.detectChanges();

      const poule = component.sortedPoules()[0];
      expect(poule.standings.find((s) => s.ref.id === 'teamA')!.played).toBe(0);
      expect(poule.standings.find((s) => s.ref.id === 'teamB')!.played).toBe(0);
    });

    it('should sort standings by wins, then points in losses, then points conceded', () => {
      const poules = buildPoules([
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
      poulesStore.patchTeams(teams);
      fixture.componentRef.setInput('poules', poules);
      fixture.detectChanges();

      const standings = component.sortedPoules()[0].standings;
      expect(standings[0].ref.id).toBe('teamA');
      expect(standings[1].ref.id).toBe('teamB');
      expect(standings[2].ref.id).toBe('teamC');
    });
  });

  describe('empty poule display', () => {
    const pouleRef = createRef('poule1');

    function buildEmptyPoules() {
      return [
        {
          ref: pouleRef,
          name: 'Poule Vide',
          refTeams: [],
          games: [],
        },
      ];
    }

    it('should not show coverage message for empty poule', async () => {
      poulesStore.patchTeams([]);
      authStore.setUser({ role: 'admin' } as never);
      fixture.componentRef.setInput('poules', buildEmptyPoules());
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
      poulesStore.patchTeams([]);
      fixture.componentRef.setInput('poules', buildEmptyPoules());
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
      poulesStore.patchTeams([
        { ref: teamARef, name: 'Team A' },
        { ref: teamBRef, name: 'Team B' },
        { ref: teamCRef, name: 'Team C' },
      ]);
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

      const close$ = new Subject<SavePouleEvent | { action: 'delete' } | undefined>();
      dialogServiceMock.open.mockReturnValue({ onClose: close$ });

      component.onEditPoule(poule);

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
      const pouleRef = createRef('poule1');
      const teamARef = createRef('teamA');
      const teamBRef = createRef('teamB');

      const poule = {
        ref: pouleRef,
        name: 'Poule 1',
        refTeams: [teamARef, teamBRef],
        games: [],
      };

      const close$ = new Subject<SavePouleEvent | { action: 'delete' } | undefined>();
      dialogServiceMock.open.mockReturnValue({ onClose: close$ });

      component.onEditPoule(poule);

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
