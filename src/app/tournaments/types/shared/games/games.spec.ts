import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { Poule } from '../../poules/poules';
import { Team } from '../teams/teams';

import { Games, GAMES_TEAM_FILTER_QUERY_PARAM } from './games';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { provideRouter, Router } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { patchState } from '@ngrx/signals';
import { vi } from 'vitest';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentDetailStore } from '../../../../store/tournament-detail.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';

describe('Games', () => {
  let component: Games;
  let fixture: ComponentFixture<Games>;
  let poulesStore: InstanceType<typeof PoulesStore>;
  let mockTournamentActions: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    mockTournamentActions = {
      saveGame: vi.fn(),
      deleteGame: vi.fn(),
      generateAllGames: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Games],
      providers: [
        ...provideTranslocoTesting(),
        provideRouter([]),
        { provide: TournamentActionsService, useValue: mockTournamentActions },
      ],
    }).compileComponents();

    poulesStore = TestBed.inject(PoulesStore);
    const tournamentDetailStore = TestBed.inject(TournamentDetailStore);
    patchState(tournamentDetailStore, {
      tournament: {
        ref: createDocumentReference('tournament-1'),
        name: 'Test Tournament',
        description: '',
        type: 'poules',
        status: 'ongoing',
        createdAt: '2026-01-01',
      } as any,
    });

    fixture = TestBed.createComponent(Games);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit only missing combinations when generating all games', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');
    const pouleRef = createDocumentReference('poule-1');

    const poule = {
      ref: pouleRef,
      name: 'Poule A',
      refTeams: [team1Ref, team2Ref, team3Ref],
      games: [
        {
          ref: createDocumentReference('game-1'),
          refTeam1: team1Ref,
          refTeam2: team2Ref,
        },
      ],
    } as Poule;

    const emitSpy = mockTournamentActions['generateAllGames'];

    component.onGenerateAllGames(poule);

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith({
      games: [
        { pouleRef, refTeam1: team1Ref, refTeam2: team3Ref },
        { pouleRef, refTeam1: team2Ref, refTeam2: team3Ref },
      ],
    });
  });

  it('should not emit when all combinations already exist', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const pouleRef = createDocumentReference('poule-1');

    const poule = {
      ref: pouleRef,
      name: 'Poule A',
      refTeams: [team1Ref, team2Ref],
      games: [
        {
          ref: createDocumentReference('game-1'),
          refTeam1: team1Ref,
          refTeam2: team2Ref,
        },
      ],
    } as Poule;

    const emitSpy = mockTournamentActions['generateAllGames'];

    component.onGenerateAllGames(poule);

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.getMissingGamesCount(poule)).toBe(0);
  });

  it('should pass sorted and enriched series to the add-game dialog', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');
    const dialogService = fixture.debugElement.injector.get(DialogService);
    const openSpy = vi.spyOn(dialogService, 'open').mockReturnValue({
      onClose: { subscribe: vi.fn() },
    } as never);

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Bravo' },
        { ref: team2Ref, name: 'Alpha' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie B',
          poules: [
            {
              ref: createDocumentReference('poule-2'),
              name: 'Poule B',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: team3Ref,
                  refTeam2: team1Ref,
                  date: new Date('2026-03-23T10:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-03-22T10:00:00Z'),
                },
              ],
            },
          ],
        },
        {
          ref: createDocumentReference('serie-2'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule C',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [],
            },
            {
              ref: createDocumentReference('poule-3'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    component.onOpenAddGame();

    expect(openSpy).toHaveBeenCalledTimes(1);

    const dialogConfig = openSpy.mock.calls[0][1] as {
      data: {
        series: {
          name: string;
          poules: {
            name: string;
            games?: {
              team1Name: string;
              team2Name: string;
              gameDateSortValue: number;
            }[];
          }[];
        }[];
      };
    };
    const sortedSeries = dialogConfig.data.series;
    const [firstGame, secondGame] = sortedSeries[1].poules[0].games ?? [];

    expect(sortedSeries.map((serie: { name: string }) => serie.name)).toEqual([
      'Serie A',
      'Serie B',
    ]);
    expect(sortedSeries[0].poules.map((poule: { name: string }) => poule.name)).toEqual([
      'Poule A',
      'Poule C',
    ]);
    expect(firstGame.team1Name).toBe('Alpha');
    expect(firstGame.team2Name).toBe('Charlie');
    expect(firstGame.gameDateSortValue).toBe(new Date('2026-03-22T10:00:00Z').getTime());
    expect(secondGame.team1Name).toBe('Charlie');
    expect(secondGame.team2Name).toBe('Bravo');
  });

  it('should group games by date in gamesByDate computed', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date('2026-03-22T10:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-03-22T14:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-3'),
                  refTeam1: team1Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-03-23T10:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-4'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const groups = component.gamesByDate();

    // Games with dates come first (sorted by date), undated games last
    expect(groups.length).toBe(3);
    expect(groups[0].dateKey).toBe('2026-03-22');
    expect(groups[0].games.length).toBe(2);
    expect(groups[1].dateKey).toBe('2026-03-23');
    expect(groups[1].games.length).toBe(1);
    // Undated group sorted last (Infinity sort value)
    expect(groups[2].dateKey).toBe('');
    expect(groups[2].games.length).toBe(1);
  });

  it('should include serie and poule context in gamesByDate entries', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date('2026-03-22T10:00:00Z'),
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const groups = component.gamesByDate();
    const game = groups[0].games[0];

    expect(game.serieName).toBe('Serie A');
    expect(game.pouleName).toBe('Poule A');
    expect(game.team1Name).toBe('Alpha');
    expect(game.team2Name).toBe('Bravo');
  });

  it('should filter games by local calendar day (same local date, near midnight)', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');
    const localGameDate = new Date(2026, 2, 22, 0, 30);

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: localGameDate,
                },
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date(2026, 2, 23, 10, 0),
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    component.onDateFilterChange(new Date(2026, 2, 22, 0, 45));

    const filtered = component.filteredFlatGamesByDate();
    expect(filtered.length).toBe(1);
    expect(filtered[0].ref.id).toBe('game-1');
  });

  it('should group and filter firestore UTC dates by local calendar day', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date('2026-04-21T00:30:00.000Z'),
                },
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-04-22T00:15:00.000Z'),
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    const groups = component.gamesByDate();
    expect(groups.map((group) => group.dateKey)).toEqual(['2026-04-21', '2026-04-22']);

    component.onDateFilterChange(new Date('2026-04-21T12:00:00.000Z'));

    const filtered = component.filteredFlatGamesByDate();
    expect(filtered.length).toBe(1);
    expect(filtered[0].ref.id).toBe('game-1');
  });

  it('should filter by date when the datepicker provides a local-midnight Date (PrimeNG scenario)', () => {
    // PrimeNG datepicker emits new Date(year, month, day) — local midnight.
    // In Europe/Paris (UTC+2), selecting April 20 yields 2026-04-19T22:00:00.000Z.
    // getDateKey must use local methods so the filter matches the correct local day.
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-april-20'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date('2026-04-20T10:00:00.000Z'), // stored as UTC
                },
                {
                  ref: createDocumentReference('game-april-21'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-04-21T16:30:00.000Z'), // stored as UTC
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    // Simulate PrimeNG datepicker emitting local midnight for April 20
    const datepickerDate = new Date(2026, 3, 20); // local midnight
    component.onDateFilterChange(datepickerDate);

    const filtered = component.filteredFlatGamesByDate();
    expect(filtered.length).toBe(1);
    expect(filtered[0].ref.id).toBe('game-april-20');
  });

  it('should display empty filtered message when active filters return no game', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date(2026, 2, 22, 10, 0),
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    component.onDateFilterChange(new Date(2026, 2, 23, 10, 0));
    fixture.detectChanges();

    const rootElement: HTMLElement = fixture.nativeElement;
    expect(component.hasActiveFilters()).toBe(true);
    expect(component.filteredFlatGamesByDate().length).toBe(0);
    expect(rootElement.textContent).toContain(
      'Aucune partie ne correspond aux filtres sélectionnés.',
    );
  });

  it('should detect only future free slots that are not already scheduled', () => {
    const now = new Date(2026, 4, 1, 9, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');

    try {
      patchState(poulesStore, {
        teams: [
          { ref: team1Ref, name: 'Alpha' },
          { ref: team2Ref, name: 'Bravo' },
        ] satisfies Team[],
      });
      patchState(poulesStore, {
        series: [
          {
            ref: createDocumentReference('serie-1'),
            name: 'Serie A',
            poules: [
              {
                ref: createDocumentReference('poule-1'),
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref],
                games: [
                  {
                    ref: createDocumentReference('game-1'),
                    refTeam1: team1Ref,
                    refTeam2: team2Ref,
                    date: new Date(2026, 4, 1, 10, 0),
                  },
                ],
              },
            ],
          },
        ],
      });
      patchState(poulesStore, {
        timeSlots: [
          { ref: createDocumentReference('slot-past'), date: new Date(2026, 4, 1, 8, 0) },
          { ref: createDocumentReference('slot-scheduled'), date: new Date(2026, 4, 1, 10, 0) },
          { ref: createDocumentReference('slot-late'), date: new Date(2026, 4, 1, 12, 0) },
          { ref: createDocumentReference('slot-early'), date: new Date(2026, 4, 1, 9, 30) },
        ],
      });

      const freeSlots = component.freeSlots();

      expect(freeSlots.map((slot) => slot.date.getTime())).toEqual([
        new Date(2026, 4, 1, 9, 30).getTime(),
        new Date(2026, 4, 1, 12, 0).getTime(),
      ]);
      expect(freeSlots.every((slot) => slot.type === 'free-slot')).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('should merge schedule rows and sort them chronologically', () => {
    const now = new Date(2026, 4, 1, 8, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    try {
      patchState(poulesStore, {
        teams: [
          { ref: team1Ref, name: 'Alpha' },
          { ref: team2Ref, name: 'Bravo' },
          { ref: team3Ref, name: 'Charlie' },
        ] satisfies Team[],
      });
      patchState(poulesStore, {
        series: [
          {
            ref: createDocumentReference('serie-1'),
            name: 'Serie A',
            poules: [
              {
                ref: createDocumentReference('poule-1'),
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref, team3Ref],
                games: [
                  {
                    ref: createDocumentReference('game-1'),
                    refTeam1: team1Ref,
                    refTeam2: team2Ref,
                    date: new Date(2026, 4, 1, 11, 0),
                  },
                  {
                    ref: createDocumentReference('game-2'),
                    refTeam1: team2Ref,
                    refTeam2: team3Ref,
                    date: new Date(2026, 4, 1, 13, 0),
                  },
                ],
              },
            ],
          },
        ],
      });
      patchState(poulesStore, {
        timeSlots: [
          { ref: createDocumentReference('slot-noon'), date: new Date(2026, 4, 1, 12, 0) },
          { ref: createDocumentReference('slot-morning'), date: new Date(2026, 4, 1, 10, 0) },
          { ref: createDocumentReference('slot-scheduled'), date: new Date(2026, 4, 1, 13, 0) },
        ],
      });

      const rows = component.scheduleRows();

      expect(
        rows.map((row) =>
          'type' in row
            ? `free:${row.date.getTime()}`
            : `game:${row.ref.id}:${row.date?.getTime() ?? 'no-date'}`,
        ),
      ).toEqual([
        `free:${new Date(2026, 4, 1, 10, 0).getTime()}`,
        `game:game-1:${new Date(2026, 4, 1, 11, 0).getTime()}`,
        `free:${new Date(2026, 4, 1, 12, 0).getTime()}`,
        `game:game-2:${new Date(2026, 4, 1, 13, 0).getTime()}`,
      ]);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('should show only free slot rows when the free-slots-only toggle is enabled', () => {
    const now = new Date(2026, 4, 1, 8, 0);
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now.getTime());
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    try {
      patchState(poulesStore, {
        teams: [
          { ref: team1Ref, name: 'Alpha' },
          { ref: team2Ref, name: 'Bravo' },
          { ref: team3Ref, name: 'Charlie' },
        ] satisfies Team[],
      });
      patchState(poulesStore, {
        series: [
          {
            ref: createDocumentReference('serie-1'),
            name: 'Serie A',
            poules: [
              {
                ref: createDocumentReference('poule-1'),
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref, team3Ref],
                games: [
                  {
                    ref: createDocumentReference('game-1'),
                    refTeam1: team1Ref,
                    refTeam2: team2Ref,
                    date: new Date(2026, 4, 1, 10, 0),
                  },
                  {
                    ref: createDocumentReference('game-2'),
                    refTeam1: team2Ref,
                    refTeam2: team3Ref,
                    date: new Date(2026, 4, 2, 10, 0),
                  },
                ],
              },
            ],
          },
        ],
      });
      patchState(poulesStore, {
        timeSlots: [
          { ref: createDocumentReference('slot-day-1'), date: new Date(2026, 4, 1, 12, 0) },
          { ref: createDocumentReference('slot-day-2'), date: new Date(2026, 4, 2, 9, 0) },
        ],
      });

      component.onDateFilterChange(new Date(2026, 4, 1, 15, 0));
      expect(component.scheduleRows().length).toBe(2);

      component.onToggleFreeSlots(true);

      const rows = component.scheduleRows();

      expect(component.hasActiveFilters()).toBe(true);
      expect(rows.length).toBe(1);
      expect(rows.every((row) => 'type' in row && row.type === 'free-slot')).toBe(true);
      expect(rows[0]!.date.getTime()).toBe(new Date(2026, 4, 1, 12, 0).getTime());
    } finally {
      nowSpy.mockRestore();
    }
  });

  describe('scroll button behavior', () => {
    it('should set showScrollToTop to true when scrollY >= innerHeight', () => {
      Object.defineProperty(window, 'scrollY', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

      component.onWindowScroll();

      expect(component.showScrollToTop()).toBe(true);
    });

    it('should set showScrollToTop to false when scrollY < innerHeight', () => {
      Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

      component.onWindowScroll();

      expect(component.showScrollToTop()).toBe(false);
    });

    it('showScrollToToday should be true when filtered games include a game today', () => {
      const team1Ref = createDocumentReference('team-1');
      const team2Ref = createDocumentReference('team-2');
      const today = new Date();

      patchState(poulesStore, {
        teams: [
          { ref: team1Ref, name: 'Alpha' },
          { ref: team2Ref, name: 'Bravo' },
        ] satisfies Team[],
      });
      patchState(poulesStore, {
        series: [
          {
            ref: createDocumentReference('serie-1'),
            name: 'Serie A',
            poules: [
              {
                ref: createDocumentReference('poule-1'),
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref],
                games: [
                  {
                    ref: createDocumentReference('game-today'),
                    refTeam1: team1Ref,
                    refTeam2: team2Ref,
                    date: today,
                  },
                ],
              },
            ],
          },
        ],
      });
      fixture.detectChanges();

      expect(component.showScrollToToday()).toBe(true);
    });

    it("showScrollToToday should be false when filters exclude today's game", () => {
      const team1Ref = createDocumentReference('team-1');
      const team2Ref = createDocumentReference('team-2');
      const today = new Date();

      patchState(poulesStore, {
        teams: [
          { ref: team1Ref, name: 'Alpha' },
          { ref: team2Ref, name: 'Bravo' },
        ] satisfies Team[],
      });
      patchState(poulesStore, {
        series: [
          {
            ref: createDocumentReference('serie-1'),
            name: 'Serie A',
            poules: [
              {
                ref: createDocumentReference('poule-1'),
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref],
                games: [
                  {
                    ref: createDocumentReference('game-today'),
                    refTeam1: team1Ref,
                    refTeam2: team2Ref,
                    date: today,
                  },
                ],
              },
            ],
          },
        ],
      });
      fixture.detectChanges();

      // Apply a date filter that does not match today
      component.onDateFilterChange(new Date(2020, 0, 1));
      fixture.detectChanges();

      expect(component.showScrollToToday()).toBe(false);
    });

    it('scrollToTop should call window.scrollTo with smooth behavior', () => {
      const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

      component.scrollToTop();

      expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      scrollSpy.mockRestore();
    });

    it("scrollToToday should call scrollIntoView on today's DOM element", () => {
      const mockScrollIntoView = vi.fn();
      const mockElement = { scrollIntoView: mockScrollIntoView } as unknown as HTMLElement;
      const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

      component.scrollToToday();

      expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
      getElementSpy.mockRestore();
    });

    it("scrollToToday should not throw when today's element is not in the DOM", () => {
      const getElementSpy = vi.spyOn(document, 'getElementById').mockReturnValue(null);

      expect(() => component.scrollToToday()).not.toThrow();
      getElementSpy.mockRestore();
    });
  });

  it('should export GAMES_TEAM_FILTER_QUERY_PARAM constant', () => {
    expect(GAMES_TEAM_FILTER_QUERY_PARAM).toBe('teamId');
  });

  it('should have null selectedTeamId by default', () => {
    expect(component.selectedTeamId()).toBeNull();
  });

  it('should filter filteredFlatGamesByDate when teamId queryParam is set', async () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    patchState(poulesStore, {
      teams: [
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
        { ref: team3Ref, name: 'Charlie' },
      ] satisfies Team[],
    });
    patchState(poulesStore, {
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule A',
              refTeams: [team1Ref, team2Ref, team3Ref],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: team1Ref,
                  refTeam2: team2Ref,
                  date: new Date('2026-03-22T10:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: team2Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-03-22T14:00:00Z'),
                },
                {
                  ref: createDocumentReference('game-3'),
                  refTeam1: team1Ref,
                  refTeam2: team3Ref,
                  date: new Date('2026-03-23T10:00:00Z'),
                },
              ],
            },
          ],
        },
      ],
    });
    fixture.detectChanges();

    // No filter: all 3 games shown
    expect(component.filteredFlatGamesByDate().length).toBe(3);

    // Navigate with teamId queryParam for team-1 (Alpha)
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { [GAMES_TEAM_FILTER_QUERY_PARAM]: 'team-1' } });
    fixture.detectChanges();
    await fixture.whenStable();

    // Only games involving team-1 (game-1 and game-3)
    expect(component.selectedTeamId()).toBe('team-1');
    expect(component.filteredFlatGamesByDate().length).toBe(2);

    // Clear filter
    await router.navigate([], { queryParams: { [GAMES_TEAM_FILTER_QUERY_PARAM]: null } });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.selectedTeamId()).toBeNull();
    expect(component.filteredFlatGamesByDate().length).toBe(3);
  });

  it('should return sortedTeams sorted alphabetically', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    patchState(poulesStore, {
      teams: [
        { ref: team3Ref, name: 'Charlie' },
        { ref: team1Ref, name: 'Alpha' },
        { ref: team2Ref, name: 'Bravo' },
      ] satisfies Team[],
    });
    fixture.detectChanges();

    const sorted = component.sortedTeams();
    expect(sorted.map((t) => t.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });
});

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
}
