import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';
import { CrossStandings } from './cross-standings';
import type { PouleStandingsInput } from './cross-standings';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('CrossStandings', () => {
  let component: CrossStandings;
  let fixture: ComponentFixture<CrossStandings>;

  // Poule A (3 teams) — standings already sorted:
  //   A: won=2, played=2, pointsInLosses=0,  pointsConceded=45
  //   B: won=1, played=2, pointsInLosses=25, pointsConceded=45
  //   C: won=0, played=2, pointsInLosses=35, pointsConceded=60
  const pouleA: PouleStandingsInput = {
    name: 'Poule A',
    refTeams: [createRef('tA'), createRef('tB'), createRef('tC')],
    standings: [
      { name: 'Team A', played: 2, won: 2, pointsInLosses: 0, pointsConceded: 45 },
      { name: 'Team B', played: 2, won: 1, pointsInLosses: 25, pointsConceded: 45 },
      { name: 'Team C', played: 2, won: 0, pointsInLosses: 35, pointsConceded: 60 },
    ],
  };

  // Poule B (2 teams) — standings already sorted:
  //   D: won=1, played=1, pointsInLosses=0,  pointsConceded=10
  //   E: won=0, played=1, pointsInLosses=10, pointsConceded=30
  const pouleB: PouleStandingsInput = {
    name: 'Poule B',
    refTeams: [createRef('tD'), createRef('tE')],
    standings: [
      { name: 'Team D', played: 1, won: 1, pointsInLosses: 0, pointsConceded: 10 },
      { name: 'Team E', played: 1, won: 0, pointsInLosses: 10, pointsConceded: 30 },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrossStandings],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CrossStandings);
    fixture.componentRef.setInput('poules', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('average mode (default)', () => {
    it('normalises by poule size — D (winRate=1, avgConceded=10) ranks above A (winRate=1, avgConceded=22.5)', () => {
      fixture.componentRef.setInput('poules', [pouleA, pouleB]);
      fixture.detectChanges();

      const standings = component.crossPouleStandings();
      // Sort: winRate desc → avgLossPoints desc → avgConceded asc
      // D(1.0, 0, 10), A(1.0, 0, 22.5), B(0.5, 12.5, 22.5), C(0, 17.5, 30), E(0, 10, 30)
      expect(standings).toHaveLength(5);
      expect(standings[0].teamName).toBe('Team D');
      expect(standings[0].rank).toBe(1);
      expect(standings[1].teamName).toBe('Team A');
      expect(standings[1].rank).toBe(2);
      expect(standings[2].teamName).toBe('Team B');
      expect(standings[2].rank).toBe(3);
      expect(standings[3].teamName).toBe('Team C');
      expect(standings[3].rank).toBe(4);
      expect(standings[4].teamName).toBe('Team E');
      expect(standings[4].rank).toBe(5);
    });
  });

  describe('drop-weakest mode', () => {
    beforeEach(() => {
      component.crossPouleMode.set('drop-weakest');
    });

    it('excludes bottom teams from larger poules down to minPouleSize', () => {
      fixture.componentRef.setInput('poules', [pouleA, pouleB]);
      fixture.detectChanges();

      const standings = component.crossPouleStandings();
      // minPouleSize=2: keep top 2 of Poule A (A, B), drop C; keep all of Poule B (D, E)
      // Sort by won desc, pointsInLosses desc, pointsConceded asc:
      // A(2,0,45), B(1,25,45), D(1,0,10), E(0,10,30)
      expect(standings).toHaveLength(4);
      expect(standings.find((s) => s.teamName === 'Team C')).toBeUndefined();
      expect(standings[0].teamName).toBe('Team A');
      expect(standings[0].rank).toBe(1);
      expect(standings[1].teamName).toBe('Team B');
      expect(standings[1].rank).toBe(2);
      expect(standings[2].teamName).toBe('Team D');
      expect(standings[2].rank).toBe(3);
      expect(standings[3].teamName).toBe('Team E');
      expect(standings[3].rank).toBe(4);
    });
  });

  describe('phantom mode', () => {
    beforeEach(() => {
      component.crossPouleMode.set('phantom');
    });

    it('augments smaller-poule teams with phantom wins (30-29)', () => {
      fixture.componentRef.setInput('poules', [pouleA, pouleB]);
      fixture.detectChanges();

      const standings = component.crossPouleStandings();
      // maxPouleSize=3, diff for Poule B = 1
      // D: augWon=2, ptsInLosses=0,  augConceded=10+29=39  → rank 1
      // A: augWon=2, ptsInLosses=0,  augConceded=45        → rank 2
      // B: augWon=1, ptsInLosses=25, augConceded=45        → rank 3
      // E: augWon=1, ptsInLosses=10, augConceded=30+29=59  → rank 4
      // C: augWon=0, ptsInLosses=35, augConceded=60        → rank 5
      expect(standings).toHaveLength(5);
      expect(standings[0].teamName).toBe('Team D');
      expect(standings[0].rank).toBe(1);
      expect(standings[1].teamName).toBe('Team A');
      expect(standings[1].rank).toBe(2);
      expect(standings[2].teamName).toBe('Team B');
      expect(standings[2].rank).toBe(3);
      expect(standings[3].teamName).toBe('Team E');
      expect(standings[3].rank).toBe(4);
      expect(standings[4].teamName).toBe('Team C');
      expect(standings[4].rank).toBe(5);
    });
  });

  describe('rank assignment', () => {
    it('assigns equal ranks to teams with identical sort keys', () => {
      fixture.componentRef.setInput('poules', [
        {
          name: 'Tie Poule 1',
          refTeams: [createRef('tp1'), createRef('tq1')],
          standings: [
            { name: 'Team P', played: 1, won: 1, pointsInLosses: 0, pointsConceded: 25 },
            { name: 'Team Q', played: 1, won: 0, pointsInLosses: 25, pointsConceded: 30 },
          ],
        },
        {
          name: 'Tie Poule 2',
          refTeams: [createRef('tr1'), createRef('ts1')],
          standings: [
            { name: 'Team R', played: 1, won: 1, pointsInLosses: 0, pointsConceded: 25 },
            { name: 'Team S', played: 1, won: 0, pointsInLosses: 25, pointsConceded: 30 },
          ],
        },
      ]);
      fixture.detectChanges();

      const standings = component.crossPouleStandings();
      // P and R: winRate=1, avgLoss=0, avgConceded=25 → both rank 1
      // Q and S: winRate=0, avgLoss=25, avgConceded=30 → both rank 3
      const winners = standings.filter((s) => s.teamName === 'Team P' || s.teamName === 'Team R');
      const losers = standings.filter((s) => s.teamName === 'Team Q' || s.teamName === 'Team S');
      expect(winners).toHaveLength(2);
      expect(winners.every((s) => s.rank === 1)).toBe(true);
      expect(losers).toHaveLength(2);
      expect(losers.every((s) => s.rank === 3)).toBe(true);
    });
  });

  describe('empty state', () => {
    it('returns empty array when no poules provided', () => {
      fixture.componentRef.setInput('poules', []);
      fixture.detectChanges();

      expect(component.crossPouleStandings()).toHaveLength(0);
    });

    it('returns empty array when all poules have no standings', () => {
      fixture.componentRef.setInput('poules', [{ name: 'Empty', refTeams: [], standings: [] }]);
      fixture.detectChanges();

      expect(component.crossPouleStandings()).toHaveLength(0);
    });
  });
});
