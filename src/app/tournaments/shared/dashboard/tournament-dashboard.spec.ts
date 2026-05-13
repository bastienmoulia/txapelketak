import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { patchState } from '@ngrx/signals';
import { TournamentDashboard } from './tournament-dashboard';
import { Tournament, TournamentStatus, UserRole } from '../../../home/tournament.interface';
import { Team } from '../teams/teams';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';
import { TournamentDetailStore } from '../../../store/tournament-detail.store';
import { PoulesStore } from '../../../store/poules.store';
import { AuthStore } from '../../../store/auth.store';
import { TournamentActionsService } from '../../../shared/services/tournament-actions.service';
import { Serie } from '../../poules.model';

function makeRef(id: string): DocumentReference {
  return { id } as DocumentReference;
}

function makeTournament(overrides?: Partial<Tournament>): Tournament {
  return {
    ref: makeRef('t1'),
    name: 'Test Tournament',
    description: '',
    type: 'poules',
    status: 'ongoing' as TournamentStatus,
    createdAt: '2026-01-01',
    ...overrides,
  };
}

function makeTeam(id: string, name: string): Team {
  return { ref: makeRef(id), name };
}

function makeGame(overrides: Partial<Game> & { refTeam1Id: string; refTeam2Id: string }): Game {
  const { refTeam1Id, refTeam2Id, ...rest } = overrides;
  return {
    ref: makeRef(`game-${refTeam1Id}-${refTeam2Id}`),
    refTeam1: makeRef(refTeam1Id),
    refTeam2: makeRef(refTeam2Id),
    ...rest,
  } as Game;
}

function makeSerie(name: string, poules: Serie['poules']): Serie {
  return { ref: makeRef(`serie-${name}`), name, poules };
}

describe('TournamentDashboard', () => {
  let fixture: ComponentFixture<TournamentDashboard>;
  let component: TournamentDashboard;
  let tournamentDetailStore: InstanceType<typeof TournamentDetailStore>;
  let poulesStore: InstanceType<typeof PoulesStore>;
  let authStore: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentDashboard],
      providers: [
        ...provideTranslocoTesting(),
        { provide: TournamentActionsService, useValue: { saveGame: vi.fn() } },
      ],
    }).compileComponents();

    tournamentDetailStore = TestBed.inject(TournamentDetailStore);
    poulesStore = TestBed.inject(PoulesStore);
    authStore = TestBed.inject(AuthStore);

    fixture = TestBed.createComponent(TournamentDashboard);
    component = fixture.componentInstance;
  });

  function setInputs(inputs: {
    tournament?: Tournament;
    teams?: Team[];
    series?: Serie[];
    role?: UserRole | '';
  }): void {
    patchState(tournamentDetailStore, { tournament: inputs.tournament ?? makeTournament() });
    if (inputs.teams) patchState(poulesStore, { teams: inputs.teams });
    if (inputs.series) patchState(poulesStore, { series: inputs.series });
    if (inputs.role !== undefined)
      authStore.setUser(inputs.role ? ({ role: inputs.role } as any) : null);
    fixture.detectChanges();
  }

  describe('teamsCount', () => {
    it('should return 0 when no teams', () => {
      setInputs({ teams: [] });
      expect(component.teamsCount()).toBe(0);
    });

    it('should return the number of teams', () => {
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C')] });
      expect(component.teamsCount()).toBe(3);
    });
  });

  describe('gamesCount', () => {
    it('should return 0 when no series', () => {
      setInputs({ series: [] });
      expect(component.gamesCount()).toBe(0);
    });

    it('should count games across all series and poules', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b' }),
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'c' }),
            ],
          },
          {
            ref: makeRef('p2'),
            name: 'P2',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'd', refTeam2Id: 'e' })],
          },
        ]),
      ];
      setInputs({ series });
      expect(component.gamesCount()).toBe(3);
    });
  });

  describe('totalScoredPoints', () => {
    it('should return 0 when no games are scored', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b' }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', scoreTeam1: 5 }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.totalScoredPoints()).toBe(0);
    });

    it('should sum both teams scores for all completed games', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', scoreTeam1: 3, scoreTeam2: 1 }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', scoreTeam1: 2, scoreTeam2: 2 }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.totalScoredPoints()).toBe(8);
    });

    it('should include score 0 in the total', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', scoreTeam1: 0, scoreTeam2: 4 }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', scoreTeam1: 0, scoreTeam2: 0 }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.totalScoredPoints()).toBe(4);
    });
  });

  describe('upcomingGames', () => {
    const futureDate1 = new Date('2027-06-01T10:00:00');
    const futureDate2 = new Date('2027-06-02T10:00:00');
    const pastDate = new Date('2020-01-01T10:00:00');

    it('should return empty when no games have future dates', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.upcomingGames()).toEqual([]);
    });

    it('should return future games sorted by date ascending', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate2 }),
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'c', date: futureDate1 }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C')],
        series,
      });
      const result = component.upcomingGames();
      expect(result.length).toBe(2);
      expect(result[0].team2Name).toBe('C');
      expect(result[1].team2Name).toBe('B');
    });

    it('should limit to 5 games', () => {
      const games: Game[] = [];
      const teams: Team[] = [];
      for (let i = 0; i < 8; i++) {
        const id = `t${i}`;
        teams.push(makeTeam(id, `Team${i}`));
      }
      for (let i = 0; i < 7; i++) {
        games.push(
          makeGame({
            refTeam1Id: `t${i}`,
            refTeam2Id: `t${i + 1}`,
            date: new Date(`2027-07-${String(i + 1).padStart(2, '0')}T10:00:00`),
          }),
        );
      }
      const series: Serie[] = [
        makeSerie('S1', [{ ref: makeRef('p1'), name: 'P1', refTeams: [], games }]),
      ];
      setInputs({ teams, series });
      expect(component.upcomingGames().length).toBe(5);
    });

    it('should resolve team names from teams input', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'Alpha'), makeTeam('b', 'Beta')], series });
      const result = component.upcomingGames();
      expect(result[0].team1Name).toBe('Alpha');
      expect(result[0].team2Name).toBe('Beta');
    });

    it('should show ? for unknown team references', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'unknown1', refTeam2Id: 'unknown2', date: futureDate1 }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [], series });
      const result = component.upcomingGames();
      expect(result[0].team1Name).toBe('?');
      expect(result[0].team2Name).toBe('?');
    });

    it('should include serie and poule names', () => {
      const series: Serie[] = [
        makeSerie('Serie A', [
          {
            ref: makeRef('p1'),
            name: 'Poule 1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.upcomingGames();
      expect(result[0].serieName).toBe('Serie A');
      expect(result[0].pouleName).toBe('Poule 1');
    });

    it('should include referees when defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: futureDate1,
                referees: ['Alice', 'Bob'],
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.upcomingGames();
      expect(result[0].referees).toEqual(['Alice', 'Bob']);
    });

    it('should return empty referees when game has no referees', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.upcomingGames();
      expect(result[0].referees).toEqual([]);
    });
  });

  describe('recentGames', () => {
    const pastDate1 = new Date('2026-03-01T10:00:00');
    const pastDate2 = new Date('2026-03-02T10:00:00');
    const pastDate3 = new Date('2026-03-03T10:00:00');

    it('should return empty when no games have scores', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.recentGames()).toEqual([]);
    });

    it('should include games where both scores are defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 3,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'Alpha'), makeTeam('b', 'Beta')], series });
      const result = component.recentGames();
      expect(result.length).toBe(1);
      expect(result[0].team1Name).toBe('Alpha');
      expect(result[0].team2Name).toBe('Beta');
      expect(result[0].scoreTeam1).toBe(3);
      expect(result[0].scoreTeam2).toBe(1);
    });

    it('should exclude games where only one score is defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1, scoreTeam1: 3 }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: pastDate2, scoreTeam2: 2 }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      expect(component.recentGames()).toEqual([]);
    });

    it('should include games with score 0', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 0,
                scoreTeam2: 0,
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.recentGames();
      expect(result.length).toBe(1);
      expect(result[0].scoreTeam1).toBe(0);
      expect(result[0].scoreTeam2).toBe(0);
    });

    it('should sort by date descending (most recent first)', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 1,
                scoreTeam2: 0,
              }),
              makeGame({
                refTeam1Id: 'c',
                refTeam2Id: 'd',
                date: pastDate3,
                scoreTeam1: 2,
                scoreTeam2: 2,
              }),
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'c',
                date: pastDate2,
                scoreTeam1: 3,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      const result = component.recentGames();
      expect(result.length).toBe(3);
      expect(result[0].scoreTeam1).toBe(2); // pastDate3 (most recent)
      expect(result[1].scoreTeam1).toBe(3); // pastDate2
      expect(result[2].scoreTeam1).toBe(1); // pastDate1 (oldest)
    });

    it('should place games without dates after dated games', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                scoreTeam1: 5,
                scoreTeam2: 0,
              }),
              makeGame({
                refTeam1Id: 'c',
                refTeam2Id: 'd',
                date: pastDate1,
                scoreTeam1: 1,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      const result = component.recentGames();
      expect(result.length).toBe(2);
      expect(result[0].scoreTeam1).toBe(1); // dated game first
      expect(result[1].scoreTeam1).toBe(5); // undated game last
    });

    it('should limit to 5 games', () => {
      const games: Game[] = [];
      const teams: Team[] = [];
      for (let i = 0; i < 8; i++) {
        teams.push(makeTeam(`t${i}`, `Team${i}`));
      }
      for (let i = 0; i < 7; i++) {
        games.push(
          makeGame({
            refTeam1Id: `t${i}`,
            refTeam2Id: `t${i + 1}`,
            date: new Date(`2026-03-${String(i + 1).padStart(2, '0')}T10:00:00`),
            scoreTeam1: i,
            scoreTeam2: i + 1,
          }),
        );
      }
      const series: Serie[] = [
        makeSerie('S1', [{ ref: makeRef('p1'), name: 'P1', refTeams: [], games }]),
      ];
      setInputs({ teams, series });
      expect(component.recentGames().length).toBe(5);
    });

    it('should include serie and poule names', () => {
      const series: Serie[] = [
        makeSerie('Serie B', [
          {
            ref: makeRef('p1'),
            name: 'Poule 2',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 2,
                scoreTeam2: 3,
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.recentGames();
      expect(result[0].serieName).toBe('Serie B');
      expect(result[0].pouleName).toBe('Poule 2');
    });

    it('should aggregate games across multiple series and poules', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 1,
                scoreTeam2: 0,
              }),
            ],
          },
        ]),
        makeSerie('S2', [
          {
            ref: makeRef('p2'),
            name: 'P2',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'c',
                refTeam2Id: 'd',
                date: pastDate2,
                scoreTeam1: 4,
                scoreTeam2: 2,
              }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      const result = component.recentGames();
      expect(result.length).toBe(2);
    });

    it('should include referees when defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 2,
                scoreTeam2: 1,
                referees: ['Alice', 'Bob'],
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.recentGames();
      expect(result[0].referees).toEqual(['Alice', 'Bob']);
    });

    it('should return empty referees when game has no referees', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 2,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.recentGames();
      expect(result[0].referees).toEqual([]);
    });
  });

  describe('overdueGames', () => {
    const pastDate1 = new Date('2020-01-01T10:00:00');
    const pastDate2 = new Date('2020-01-02T10:00:00');
    const futureDate = new Date('2027-06-01T10:00:00');

    it('should return empty when no games have a past date without score', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.overdueGames()).toEqual([]);
    });

    it('should include past games without scores', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'Alpha'), makeTeam('b', 'Beta')], series });
      const result = component.overdueGames();
      expect(result.length).toBe(1);
      expect(result[0].team1Name).toBe('Alpha');
      expect(result[0].team2Name).toBe('Beta');
    });

    it('should include past games where only one score is defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1, scoreTeam1: 3 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.overdueGames().length).toBe(1);
    });

    it('should exclude past games where both scores are defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({
                refTeam1Id: 'a',
                refTeam2Id: 'b',
                date: pastDate1,
                scoreTeam1: 3,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.overdueGames()).toEqual([]);
    });

    it('should exclude future games without scores', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: futureDate })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      expect(component.overdueGames()).toEqual([]);
    });

    it('should sort by date ascending (oldest overdue first)', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: pastDate2 }),
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 }),
            ],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      const result = component.overdueGames();
      expect(result.length).toBe(2);
      expect(result[0].date.getTime()).toBe(pastDate1.getTime());
      expect(result[1].date.getTime()).toBe(pastDate2.getTime());
    });

    it('should include serie and poule names', () => {
      const series: Serie[] = [
        makeSerie('Serie X', [
          {
            ref: makeRef('p1'),
            name: 'Poule 3',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.overdueGames();
      expect(result[0].serieName).toBe('Serie X');
      expect(result[0].pouleName).toBe('Poule 3');
    });

    it('should include referees when defined', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1, referees: ['Alice'] }),
            ],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.overdueGames();
      expect(result[0].referees).toEqual(['Alice']);
    });

    it('should return empty referees when game has no referees', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 })],
          },
        ]),
      ];
      setInputs({ teams: [makeTeam('a', 'A'), makeTeam('b', 'B')], series });
      const result = component.overdueGames();
      expect(result[0].referees).toEqual([]);
    });

    it('should aggregate overdue games across multiple series and poules', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: pastDate1 })],
          },
        ]),
        makeSerie('S2', [
          {
            ref: makeRef('p2'),
            name: 'P2',
            refTeams: [],
            games: [makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: pastDate2 })],
          },
        ]),
      ];
      setInputs({
        teams: [makeTeam('a', 'A'), makeTeam('b', 'B'), makeTeam('c', 'C'), makeTeam('d', 'D')],
        series,
      });
      expect(component.overdueGames().length).toBe(2);
    });
  });

  describe('warnings', () => {
    it('should count games without a date', () => {
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b' }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: new Date('2026-01-01T10:00:00') }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.undatedGamesCount()).toBe(1);
    });

    it('should count stale unscored games and react to time updates', () => {
      const now = new Date('2026-01-01T12:00:00').getTime();
      const staleDate = new Date(now - 70 * 60 * 1000);

      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: staleDate }),
              makeGame({
                refTeam1Id: 'c',
                refTeam2Id: 'd',
                date: staleDate,
                scoreTeam1: 3,
                scoreTeam2: 1,
              }),
            ],
          },
        ]),
      ];

      setInputs({ series });
      component.nowMs.set(now);

      expect(component.staleUnscoredGamesCount()).toBe(1);

      component.nowMs.set(now - 20 * 60 * 1000);

      expect(component.staleUnscoredGamesCount()).toBe(0);
    });

    it('should count only games in the coming week without referees', () => {
      const now = new Date('2026-01-01T12:00:00').getTime();
      const inThreeDays = new Date(now + 3 * 24 * 60 * 60 * 1000);
      const inEightDays = new Date(now + 8 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now - 24 * 60 * 60 * 1000);
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: inThreeDays }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: inEightDays, referees: [] }),
              makeGame({ refTeam1Id: 'e', refTeam2Id: 'f', date: yesterday, referees: [] }),
              makeGame({
                refTeam1Id: 'g',
                refTeam2Id: 'h',
                date: inThreeDays,
                referees: ['Ref A'],
              }),
            ],
          },
        ]),
      ];

      setInputs({ series });
      component.nowMs.set(now);

      expect(component.gamesWithoutRefereesCount()).toBe(1);
    });

    it('should not count games outside the coming week even without referees', () => {
      const now = new Date('2026-01-01T12:00:00').getTime();
      const inEightDays = new Date(now + 8 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(now - 24 * 60 * 60 * 1000);
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: inEightDays }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: yesterday, referees: [] }),
              makeGame({ refTeam1Id: 'e', refTeam2Id: 'f' }),
            ],
          },
        ]),
      ];

      setInputs({ series });
      component.nowMs.set(now);

      expect(component.gamesWithoutRefereesCount()).toBe(0);
    });

    it('should show warnings only for admin and organizer roles', () => {
      setInputs({ role: 'admin' });
      expect(component.showWarnings()).toBe(true);

      setInputs({ role: 'organizer' });
      expect(component.showWarnings()).toBe(true);

      setInputs({ role: 'observer' });
      expect(component.showWarnings()).toBe(false);

      setInputs({ role: '' });
      expect(component.showWarnings()).toBe(false);
    });

    it('should count time slots with simultaneous games', () => {
      const sameTime = new Date('2026-01-01T10:00:00');
      const otherTime = new Date('2026-01-01T12:00:00');
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: sameTime }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: sameTime }),
              makeGame({ refTeam1Id: 'e', refTeam2Id: 'f', date: otherTime }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.simultaneousGamesCount()).toBe(1);
    });

    it('should return 0 when no simultaneous games', () => {
      const time1 = new Date('2026-01-01T10:00:00');
      const time2 = new Date('2026-01-01T11:00:00');
      const time3 = new Date('2026-01-01T12:00:00');
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: time1 }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: time2 }),
              makeGame({ refTeam1Id: 'e', refTeam2Id: 'f', date: time3 }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.simultaneousGamesCount()).toBe(0);
    });

    it('should count multiple conflicting time slots', () => {
      const time1 = new Date('2026-01-01T10:00:00');
      const time2 = new Date('2026-01-01T14:00:00');
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: time1 }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd', date: time1 }),
              makeGame({ refTeam1Id: 'e', refTeam2Id: 'f', date: time2 }),
              makeGame({ refTeam1Id: 'g', refTeam2Id: 'h', date: time2 }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.simultaneousGamesCount()).toBe(2);
    });

    it('should ignore games without a date when counting simultaneous games', () => {
      const sameTime = new Date('2026-01-01T10:00:00');
      const series: Serie[] = [
        makeSerie('S1', [
          {
            ref: makeRef('p1'),
            name: 'P1',
            refTeams: [],
            games: [
              makeGame({ refTeam1Id: 'a', refTeam2Id: 'b', date: sameTime }),
              makeGame({ refTeam1Id: 'c', refTeam2Id: 'd' }),
            ],
          },
        ]),
      ];

      setInputs({ series });

      expect(component.simultaneousGamesCount()).toBe(0);
    });
  });

  describe('descriptionHtml', () => {
    it('should return empty string when tournament has no description', () => {
      setInputs({ tournament: makeTournament({ description: '' }) });
      expect(component.descriptionHtml()).toBe('');
    });

    it('should render markdown as HTML', () => {
      setInputs({ tournament: makeTournament({ description: '## Hello\n\n**World**' }) });
      const html = component.descriptionHtml();

      expect(html).toContain('<h2>Hello</h2>');
      expect(html).toContain('<strong>World</strong>');
    });

    it('should sanitize unsafe HTML', () => {
      setInputs({ tournament: makeTournament({ description: 'safe<script>alert(1)</script>' }) });
      const html = component.descriptionHtml();

      expect(html).toContain('safe');
      expect(html).not.toContain('<script>');
    });
  });

  describe('toggleDescription', () => {
    it('should toggle descriptionExpanded', () => {
      setInputs({});
      expect(component.descriptionExpanded()).toBe(false);
      component.toggleDescription();
      expect(component.descriptionExpanded()).toBe(true);
      component.toggleDescription();
      expect(component.descriptionExpanded()).toBe(false);
    });
  });
});
