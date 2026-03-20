import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { Poule } from '../../poules/poules';

import { Games } from './games';
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
});

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
}
