import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { Playoffs } from './playoffs';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';
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
            savePlayoff: vi.fn(),
            deletePlayoff: vi.fn(),
          },
        },
        {
          provide: DialogService,
          useValue: {
            open: vi.fn(),
          },
        },
        {
          provide: ConfirmationService,
          useValue: {
            confirm: vi.fn(),
          },
        },
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

      expect(component.getTeamName(mockTeamRef, 0, 0, 0, 3)).toBe('Team 1');
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
      expect(component.getTeamName(unknownRef, 0, 0, 0, 3)).toBe('?');
    });
  });

  it('should return placeholder when both first-round slots are empty', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      expect(component.getTeamName(undefined, 0, 0, 0, 3)).toBe('À renseigner');
      expect(component.getTeamName(undefined, 0, 0, 1, 3)).toBe('À renseigner');
    });
  });

  it('should return placeholder when only one first-round slot is empty and bye is not explicit', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      expect(component.getTeamName(undefined, 0, 0, 0, 3, false, mockTeamRef)).toBe('À renseigner');
      expect(component.getTeamName(undefined, 0, 0, 1, 3, false, mockTeamRef)).toBe('À renseigner');
    });
  });

  it('should return bye when first-round slot is empty and bye is explicit', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      expect(component.getTeamName(undefined, 0, 0, 0, 3, true, mockTeamRef)).toBe('Exempt');
      expect(component.getTeamName(undefined, 0, 0, 1, 3, true, mockTeamRef)).toBe('Exempt');
    });
  });

  it('should render only one team row for explicit bye matches in first round', () => {
    TestBed.runInInjectionContext(() => {
      const byeGame: Game = {
        ref: {
          id: 'game-bye',
          path: 'series/test/playoffs/playoff-1/games/game-bye',
        } as unknown as DocumentReference,
        refTeam1: mockTeamRef,
        refTeam2: undefined,
        isBye: true,
        roundSize: 2,
        matchNumber: 1,
      };

      fixture.componentRef.setInput('playoffs', [
        {
          ...mockPlayoff,
          games: [byeGame],
        },
      ]);
      fixture.detectChanges();

      const matchCard = fixture.nativeElement.querySelector('.playoff-match-card') as HTMLElement;
      const teamRows = matchCard.querySelectorAll('.finale-match-team');

      expect(teamRows.length).toBe(1);
      expect(matchCard.textContent).toContain('Team 1');
      expect(matchCard.textContent).not.toContain('Exempt');
    });
  });

  it('should return sequential winner labels for semifinal slots when teams are not resolved yet', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', []);
      fixture.detectChanges();

      expect(component.getTeamName(undefined, 1, 0, 0, 3)).toBe('Gagnant Quart de finale 1');
      expect(component.getTeamName(undefined, 1, 0, 1, 3)).toBe('Gagnant Quart de finale 2');
      expect(component.getTeamName(undefined, 1, 1, 0, 3)).toBe('Gagnant Quart de finale 3');
      expect(component.getTeamName(undefined, 1, 1, 1, 3)).toBe('Gagnant Quart de finale 4');
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

  it('should open edit dialog and save playoff updates', () => {
    const dialogService = TestBed.inject(DialogService);
    const tournamentActions = TestBed.inject(TournamentActionsService) as unknown as {
      savePlayoff: ReturnType<typeof vi.fn>;
    };
    const close$ = new Subject<{
      ref: DocumentReference;
      name: string;
      hiddenFromVisitors: boolean;
    }>();
    vi.spyOn(dialogService, 'open').mockReturnValue({ onClose: close$ } as never);

    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', [mockPlayoff]);
      fixture.detectChanges();

      component.onEditPlayoff(mockPlayoff);
      close$.next({ ref: mockPlayoffRef, name: 'Updated Playoff', hiddenFromVisitors: true });
    });

    expect(tournamentActions.savePlayoff).toHaveBeenCalledWith({
      ref: mockPlayoffRef,
      name: 'Updated Playoff',
      hiddenFromVisitors: true,
    });
  });

  it('should ask confirmation before deleting playoff from edit dialog', () => {
    const dialogService = TestBed.inject(DialogService);
    const confirmationService = TestBed.inject(ConfirmationService) as unknown as {
      confirm: ReturnType<typeof vi.fn>;
    };
    const tournamentActions = TestBed.inject(TournamentActionsService) as unknown as {
      deletePlayoff: ReturnType<typeof vi.fn>;
    };
    const close$ = new Subject<{ action: 'delete' }>();
    vi.spyOn(dialogService, 'open').mockReturnValue({ onClose: close$ } as never);

    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('playoffs', [mockPlayoff]);
      fixture.detectChanges();

      component.onEditPlayoff(mockPlayoff);
      close$.next({ action: 'delete' });
    });

    expect(confirmationService.confirm).toHaveBeenCalledOnce();
    const confirmationConfig = confirmationService.confirm.mock.calls[0]?.[0];
    confirmationConfig?.accept?.();
    expect(tournamentActions.deletePlayoff).toHaveBeenCalledWith(mockPlayoff);
  });
});
