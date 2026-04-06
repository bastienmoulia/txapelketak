import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { Poule } from '../../poules/poules';
import { Team } from '../teams/teams';

import { Games, GamesViewMode } from './games';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('Games', () => {
  let component: Games;
  let fixture: ComponentFixture<Games>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Games],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Games);
    fixture.componentRef.setInput('teams', []);
    fixture.componentRef.setInput('series', []);
    fixture.componentRef.setInput('tournament', {
      ref: createDocumentReference('tournament-1'),
      name: 'Test Tournament',
      description: '',
      type: 'poules',
      status: 'ongoing',
      createdAt: '2026-01-01',
    });
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

    const emitSpy = vi.spyOn(component.generateAllGames, 'emit');

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

    const emitSpy = vi.spyOn(component.generateAllGames, 'emit');

    component.onGenerateAllGames(poule);

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.getMissingGamesCount(poule)).toBe(0);
  });

  it('should enrich games with sortable team names and keep default date ordering', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    fixture.componentRef.setInput('teams', [
      { ref: team1Ref, name: 'Bravo' },
      { ref: team2Ref, name: 'Alpha' },
      { ref: team3Ref, name: 'Charlie' },
    ] satisfies Team[]);
    fixture.componentRef.setInput('series', [
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
    ]);
    fixture.detectChanges();

    const [firstGame, secondGame] = component.sortedSeries()[0].poules[0].games ?? [];

    expect(firstGame.team1Name).toBe('Alpha');
    expect(firstGame.team2Name).toBe('Charlie');
    expect(firstGame.gameDateSortValue).toBe(new Date('2026-03-22T10:00:00Z').getTime());
    expect(secondGame.team1Name).toBe('Charlie');
    expect(secondGame.team2Name).toBe('Bravo');
  });

  it('should populate the datepicker model when editing a game with a date', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const pouleRef = createDocumentReference('poule-1');
    const gameDate = new Date('2026-03-22T10:15:00');

    const poule = {
      ref: pouleRef,
      name: 'Poule A',
      refTeams: [team1Ref, team2Ref],
      games: [],
    } as Poule;

    const game = {
      ref: createDocumentReference('game-1'),
      refTeam1: team1Ref,
      refTeam2: team2Ref,
      scoreTeam1: 10,
      scoreTeam2: 8,
      date: gameDate,
    };

    component.onEditGame(poule, game);

    expect(component.gameDate()).toEqual(gameDate);
    expect(component.gameDateModel).toBeInstanceOf(Date);
    expect(component.gameDateString).not.toBe('');
  });

  it('should group games by date in gamesByDate computed', () => {
    const team1Ref = createDocumentReference('team-1');
    const team2Ref = createDocumentReference('team-2');
    const team3Ref = createDocumentReference('team-3');

    fixture.componentRef.setInput('teams', [
      { ref: team1Ref, name: 'Alpha' },
      { ref: team2Ref, name: 'Bravo' },
      { ref: team3Ref, name: 'Charlie' },
    ] satisfies Team[]);
    fixture.componentRef.setInput('series', [
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
    ]);
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

    fixture.componentRef.setInput('teams', [
      { ref: team1Ref, name: 'Alpha' },
      { ref: team2Ref, name: 'Bravo' },
    ] satisfies Team[]);
    fixture.componentRef.setInput('series', [
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
    ]);
    fixture.detectChanges();

    const groups = component.gamesByDate();
    const game = groups[0].games[0];

    expect(game.serieName).toBe('Serie A');
    expect(game.pouleName).toBe('Poule A');
    expect(game.team1Name).toBe('Alpha');
    expect(game.team2Name).toBe('Bravo');
  });

  it('should default viewMode to by-pool', () => {
    expect(component.viewMode()).toBe('by-pool' satisfies GamesViewMode);
  });
});

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
}
