import { Component, computed, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { TranslocoPipe } from '@jsverse/transloco';
import { SelectButton } from 'primeng/selectbutton';

type CrossPouleMode = 'average' | 'drop-weakest' | 'phantom';

interface CrossPouleEntry {
  rank: number;
  teamName: string;
  pouleName: string;
}

interface TeamStanding {
  name: string;
  played: number;
  won: number;
  pointsInLosses: number;
  pointsConceded: number;
}

export interface PouleStandingsInput {
  name: string;
  refTeams?: DocumentReference[];
  standings: TeamStanding[];
}

@Component({
  selector: 'app-phases-cross-standings',
  imports: [FormsModule, SelectButton, TranslocoPipe],
  templateUrl: './cross-standings.html',
  styleUrl: './cross-standings.css',
})
export class CrossStandings {
  poules = input.required<PouleStandingsInput[]>();

  crossPouleMode = signal<CrossPouleMode>('average');

  readonly modeOptions: { value: CrossPouleMode; labelKey: string }[] = [
    { value: 'average', labelKey: 'admin.poules.crossStandings.modeAverage' },
    { value: 'drop-weakest', labelKey: 'admin.poules.crossStandings.modeDropWeakest' },
    { value: 'phantom', labelKey: 'admin.poules.crossStandings.modePhantom' },
  ];

  crossPouleStandings = computed<CrossPouleEntry[]>(() => {
    const mode = this.crossPouleMode();
    const poules = this.poules();

    interface EnrichedTeam {
      standing: TeamStanding;
      pouleName: string;
      pouleSize: number;
      standingRank: number;
    }

    const allTeams: EnrichedTeam[] = [];
    for (const poule of poules) {
      const pouleSize = poule.refTeams?.length ?? 0;
      poule.standings.forEach((standing, idx) => {
        allTeams.push({ standing, pouleName: poule.name, pouleSize, standingRank: idx });
      });
    }

    if (allTeams.length === 0) return [];

    const maxPouleSize = Math.max(...allTeams.map((t) => t.pouleSize));
    const minPouleSize = Math.min(...allTeams.map((t) => t.pouleSize));

    type SortKey = [number, number, number];
    let candidates: { name: string; pouleName: string; sortKey: SortKey }[];

    if (mode === 'average') {
      candidates = allTeams.map((t) => {
        const s = t.standing;
        const potential = Math.max(t.pouleSize - 1, 1);
        const winRate = s.won / potential;
        const avgLossPoints = s.played > 0 ? s.pointsInLosses / s.played : 0;
        const avgConceded = s.played > 0 ? s.pointsConceded / s.played : 0;
        return {
          name: s.name,
          pouleName: t.pouleName,
          sortKey: [winRate, avgLossPoints, avgConceded] as SortKey,
        };
      });
    } else if (mode === 'drop-weakest') {
      candidates = allTeams
        .filter((t) => t.standingRank < minPouleSize)
        .map((t) => {
          const s = t.standing;
          return {
            name: s.name,
            pouleName: t.pouleName,
            sortKey: [s.won, s.pointsInLosses, s.pointsConceded] as SortKey,
          };
        });
    } else {
      // phantom
      candidates = allTeams.map((t) => {
        const s = t.standing;
        const diff = maxPouleSize - t.pouleSize;
        return {
          name: s.name,
          pouleName: t.pouleName,
          sortKey: [s.won + diff, s.pointsInLosses, s.pointsConceded + 29 * diff] as SortKey,
        };
      });
    }

    candidates.sort((a, b) => {
      if (b.sortKey[0] !== a.sortKey[0]) return b.sortKey[0] - a.sortKey[0];
      if (b.sortKey[1] !== a.sortKey[1]) return b.sortKey[1] - a.sortKey[1];
      return a.sortKey[2] - b.sortKey[2];
    });

    const result: CrossPouleEntry[] = [];
    let currentRank = 1;
    for (let i = 0; i < candidates.length; i++) {
      if (i > 0) {
        const prev = candidates[i - 1].sortKey;
        const curr = candidates[i].sortKey;
        if (prev[0] !== curr[0] || prev[1] !== curr[1] || prev[2] !== curr[2]) {
          currentRank = i + 1;
        }
      }
      result.push({
        rank: currentRank,
        teamName: candidates[i].name,
        pouleName: candidates[i].pouleName,
      });
    }

    return result;
  });
}
