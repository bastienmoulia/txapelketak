import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { FreePhases } from './free-phases';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';
import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { FreePhase, Game } from '../../../models';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import type { DocumentReference } from '@angular/fire/firestore';

describe('FreePhases', () => {
  let component: FreePhases;
  let fixture: ComponentFixture<FreePhases>;

  const mockSerieRef = {
    id: 'serie-1',
    path: 'tournaments/test/series/serie-1',
  } as unknown as DocumentReference;

  const mockFreePhaseRef = {
    id: 'free-phase-1',
    path: 'series/test/freePhases/free-phase-1',
  } as unknown as DocumentReference;

  const mockTeamRef = {
    id: 'team-1',
    path: 'tournaments/test/teams/team-1',
  } as unknown as DocumentReference;

  const mockTeam2Ref = {
    id: 'team-2',
    path: 'tournaments/test/teams/team-2',
  } as unknown as DocumentReference;

  const mockGame: Game = {
    ref: {
      id: 'game-1',
      path: 'series/test/freePhases/free-phase-1/games/game-1',
    } as unknown as DocumentReference,
    refTeam1: mockTeamRef,
    refTeam2: mockTeam2Ref,
  };

  const mockFreePhase: FreePhase = {
    ref: mockFreePhaseRef,
    name: 'Phase libre 1',
    games: [mockGame],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreePhases],
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
            teams: () => [
              { ref: mockTeamRef, name: 'Team 1' },
              { ref: mockTeam2Ref, name: 'Team 2' },
            ],
          },
        },
        {
          provide: TournamentActionsService,
          useValue: {
            saveGame: vi.fn(),
            saveFreePhase: vi.fn(),
            deleteFreePhase: vi.fn(),
            deleteGame: vi.fn(),
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

    fixture = TestBed.createComponent(FreePhases);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve team name from ref', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', []);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      expect(component.getTeamName(mockTeamRef)).toBe('Team 1');
    });
  });

  it('should return ? for unknown team ref', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', []);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const unknownRef = { id: 'unknown' } as unknown as DocumentReference;
      expect(component.getTeamName(unknownRef)).toBe('?');
    });
  });

  it('should return ? when team ref is undefined', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', []);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      expect(component.getTeamName(undefined)).toBe('?');
    });
  });

  it('should show no-games message when free phase has no games', () => {
    TestBed.runInInjectionContext(() => {
      const emptyFreePhase: FreePhase = { ...mockFreePhase, games: [] };
      fixture.componentRef.setInput('freePhases', [emptyFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const noGamesMsg = fixture.nativeElement.querySelector(
        '[data-testid="free-phase-no-games-message"]',
      );
      expect(noGamesMsg).toBeTruthy();
    });
  });

  it('should display game cards when free phase has games', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const gameCards = fixture.nativeElement.querySelectorAll(
        '[data-testid="free-phase-game-card"]',
      );
      expect(gameCards.length).toBe(1);
    });
  });

  it('should display hidden indicator for hidden free phases', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [
        { ...mockFreePhase, hiddenFromVisitors: true },
      ]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const hiddenIndicator = fixture.nativeElement.querySelector(
        '[data-testid="free-phase-hidden-indicator"]',
      );
      expect(hiddenIndicator).toBeTruthy();
    });
  });

  it('should not show hidden indicator for visible free phases', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [
        { ...mockFreePhase, hiddenFromVisitors: false },
      ]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const hiddenIndicator = fixture.nativeElement.querySelector(
        '[data-testid="free-phase-hidden-indicator"]',
      );
      expect(hiddenIndicator).toBeNull();
    });
  });

  it('should show edit and add-game buttons for admin', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-free-phase-button"]');
      const addGameBtn = fixture.nativeElement.querySelector(
        '[data-testid="add-free-phase-game-button"]',
      );
      expect(editBtn).toBeTruthy();
      expect(addGameBtn).toBeTruthy();
    });
  });

  it('should open edit dialog and save free phase updates', () => {
    const dialogService = TestBed.inject(DialogService);
    const tournamentActions = TestBed.inject(TournamentActionsService) as unknown as {
      saveFreePhase: ReturnType<typeof vi.fn>;
    };
    const close$ = new Subject<{
      serieRef: DocumentReference;
      name: string;
      hiddenFromVisitors: boolean;
      ref: DocumentReference;
    }>();
    vi.spyOn(dialogService, 'open').mockReturnValue({ onClose: close$ } as never);

    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      component.onEditFreePhase(mockFreePhase);
      close$.next({
        serieRef: mockSerieRef,
        name: 'Phase modifiée',
        hiddenFromVisitors: true,
        ref: mockFreePhaseRef,
      });
    });

    expect(tournamentActions.saveFreePhase).toHaveBeenCalledWith({
      serieRef: mockSerieRef,
      name: 'Phase modifiée',
      hiddenFromVisitors: true,
      ref: mockFreePhaseRef,
    });
  });

  it('should ask confirmation before deleting free phase from edit dialog', () => {
    const dialogService = TestBed.inject(DialogService);
    const confirmationService = TestBed.inject(ConfirmationService) as unknown as {
      confirm: ReturnType<typeof vi.fn>;
    };
    const tournamentActions = TestBed.inject(TournamentActionsService) as unknown as {
      deleteFreePhase: ReturnType<typeof vi.fn>;
    };
    const close$ = new Subject<{ action: 'delete' }>();
    vi.spyOn(dialogService, 'open').mockReturnValue({ onClose: close$ } as never);

    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      component.onEditFreePhase(mockFreePhase);
      close$.next({ action: 'delete' });
    });

    expect(confirmationService.confirm).toHaveBeenCalledOnce();
    const confirmationConfig = confirmationService.confirm.mock.calls[0]?.[0];
    confirmationConfig?.accept?.();
    expect(tournamentActions.deleteFreePhase).toHaveBeenCalledWith(mockFreePhase);
  });

  it('should open add game dialog when onAddGame is called', () => {
    const dialogService = TestBed.inject(DialogService);
    const openSpy = vi.spyOn(dialogService, 'open').mockReturnValue({
      onClose: new Subject(),
    } as never);

    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      component.onAddGame(mockFreePhase);
    });

    expect(openSpy).toHaveBeenCalledOnce();
  });
});

describe('FreePhases (organizer)', () => {
  let component: FreePhases;
  let fixture: ComponentFixture<FreePhases>;

  const mockSerieRef = { id: 'serie-1' } as unknown as DocumentReference;
  const mockFreePhaseRef = { id: 'free-phase-1' } as unknown as DocumentReference;
  const mockFreePhase: FreePhase = {
    ref: mockFreePhaseRef,
    name: 'Phase libre',
    games: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreePhases],
      providers: [
        ...provideTranslocoTesting(),
        {
          provide: AuthStore,
          useValue: { role: () => 'organizer' },
        },
        {
          provide: PoulesStore,
          useValue: { teams: () => [] },
        },
        {
          provide: TournamentActionsService,
          useValue: {
            saveGame: vi.fn(),
            saveFreePhase: vi.fn(),
            deleteFreePhase: vi.fn(),
            deleteGame: vi.fn(),
          },
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: ConfirmationService,
          useValue: { confirm: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreePhases);
    component = fixture.componentInstance;
  });

  it('should show add-game button but not edit button for organizer', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const addGameBtn = fixture.nativeElement.querySelector(
        '[data-testid="add-free-phase-game-button"]',
      );
      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-free-phase-button"]');
      expect(addGameBtn).toBeTruthy();
      expect(editBtn).toBeNull();
    });
  });
});

describe('FreePhases (visitor)', () => {
  let component: FreePhases;
  let fixture: ComponentFixture<FreePhases>;

  const mockSerieRef = { id: 'serie-1' } as unknown as DocumentReference;
  const mockFreePhaseRef = { id: 'free-phase-1' } as unknown as DocumentReference;
  const mockFreePhase: FreePhase = {
    ref: mockFreePhaseRef,
    name: 'Phase libre',
    games: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreePhases],
      providers: [
        ...provideTranslocoTesting(),
        {
          provide: AuthStore,
          useValue: { role: () => 'visitor' },
        },
        {
          provide: PoulesStore,
          useValue: { teams: () => [] },
        },
        {
          provide: TournamentActionsService,
          useValue: {
            saveGame: vi.fn(),
            saveFreePhase: vi.fn(),
            deleteFreePhase: vi.fn(),
            deleteGame: vi.fn(),
          },
        },
        {
          provide: DialogService,
          useValue: { open: vi.fn() },
        },
        {
          provide: ConfirmationService,
          useValue: { confirm: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreePhases);
    component = fixture.componentInstance;
  });

  it('should not show add-game or edit buttons for visitor', () => {
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('freePhases', [mockFreePhase]);
      fixture.componentRef.setInput('serieRef', mockSerieRef);
      fixture.detectChanges();

      const addGameBtn = fixture.nativeElement.querySelector(
        '[data-testid="add-free-phase-game-button"]',
      );
      const editBtn = fixture.nativeElement.querySelector('[data-testid="edit-free-phase-button"]');
      expect(addGameBtn).toBeNull();
      expect(editBtn).toBeNull();
    });
  });
});
