import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Playoffs } from './playoffs';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { Playoff, Game } from '../../../models';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import type { DocumentReference } from '@angular/fire/firestore';

describe('Playoffs', () => {
  let component: Playoffs;
  let fixture: ComponentFixture<Playoffs>;

  const mockPlayoffRef = {
    id: 'playoff-1',
    path: 'series/test/playoffs/playoff-1',
  } as unknown as DocumentReference;
  const mockTeamRef = {
    id: 'team-1',
    path: 'tournaments/test/teams/team-1',
  } as unknown as DocumentReference;

  const mockGame: Game = {
    ref: {
      id: 'game-1',
      path: 'series/test/playoffs/playoff-1/games/game-1',
    } as unknown as DocumentReference,
    refTeam1: mockTeamRef,
    refTeam2: mockTeamRef,
    roundSize: 2,
    matchNumber: 1,
    name: 'Finale',
  };

  const mockPlayoff: Playoff = {
    ref: mockPlayoffRef,
    name: 'Test Playoff',
    orderedTeamRefs: [mockTeamRef],
    size: 2,
    games: [mockGame],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Playoffs],
      providers: [
        ...provideTranslocoTesting(),
        {
          provide: AuthStore,
          useValue: {
            role: () => 'admin',
          },
        },
        {
          provide: PoulesStore,
          useValue: {
            teams: () => [{ ref: mockTeamRef, name: 'Team 1' }],
          },
        },
        {
          provide: TournamentActionsService,
          useValue: {
            saveGame: vi.fn(),
            deletePlayoff: vi.fn(),
          },
        },
        {
          provide: DialogService,
          useValue: {
            open: vi.fn(),
          },
        },
        ConfirmationService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Playoffs);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display sorted playoffs', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', [mockPlayoff]);
      fixture.detectChanges();

      const playoffsWithRounds = component.sortedPlayoffs();
      expect(playoffsWithRounds.length).toBe(1);
      expect(playoffsWithRounds[0].playoff.name).toBe('Test Playoff');
    });
  });

  it('should group matches by round size', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', [mockPlayoff]);
      fixture.detectChanges();

      const playoffsWithRounds = component.sortedPlayoffs();
      expect(playoffsWithRounds[0].rounds.length).toBe(1);
      expect(playoffsWithRounds[0].rounds[0].roundSize).toBe(2);
      expect(playoffsWithRounds[0].rounds[0].matches.length).toBe(1);
    });
  });

  it('should get team name from ref', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      expect(component.getTeamName(mockTeamRef)).toBe('Team 1');
    });
  });

  it('should return ? for unknown team', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      const unknownRef = {
        id: 'unknown',
        path: 'tournaments/test/teams/unknown',
      } as unknown as DocumentReference;
      expect(component.getTeamName(unknownRef)).toBe('?');
    });
  });

  it('should display a hidden indicator for organizers on hidden playoffs', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', [{ ...mockPlayoff, hiddenFromVisitors: true }]);
      fixture.detectChanges();

      const hiddenIndicator = fixture.nativeElement.querySelector(
        '[data-testid="playoff-hidden-indicator"]',
      );
      expect(hiddenIndicator).toBeTruthy();
    });
  });
});
