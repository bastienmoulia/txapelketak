import { DocumentReference } from '@angular/fire/firestore';
import { parseFirestoreDate } from '../poules/poules';

export interface FinaleData {
  numberOfTeams?: number;
}

export interface KnockoutMatch {
  ref: DocumentReference;
  roundIndex: number;
  matchIndex: number;
  team1Name?: string;
  team2Name?: string;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
  date?: Date;
  finished?: boolean;
}

export interface KnockoutRound {
  roundIndex: number;
  roundName: string;
  matches: KnockoutMatch[];
}

export function buildKnockoutRounds(
  matches: KnockoutMatch[],
  totalRounds: number,
  translateFn: (key: string) => string,
): KnockoutRound[] {
  const rounds: KnockoutRound[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const roundMatches = matches
      .filter((m) => m.roundIndex === r)
      .sort((a, b) => a.matchIndex - b.matchIndex);
    rounds.push({
      roundIndex: r,
      roundName: getRoundName(r, totalRounds, translateFn),
      matches: roundMatches,
    });
  }
  return rounds;
}

export function getRoundName(
  roundIndex: number,
  totalRounds: number,
  translateFn: (key: string) => string,
): string {
  const stepsFromFinal = totalRounds - 1 - roundIndex;
  switch (stepsFromFinal) {
    case 0:
      return translateFn('admin.finale.rounds.final');
    case 1:
      return translateFn('admin.finale.rounds.semiFinal');
    case 2:
      return translateFn('admin.finale.rounds.quarterFinal');
    case 3:
      return translateFn('admin.finale.rounds.roundOf16');
    case 4:
      return translateFn('admin.finale.rounds.roundOf32');
    default:
      return translateFn('admin.finale.rounds.round') + ' ' + (roundIndex + 1);
  }
}

export function generateKnockoutBracket(
  numberOfTeams: number,
  translateFn: (key: string, params?: Record<string, unknown>) => string,
): Omit<KnockoutMatch, 'ref'>[] {
  const totalRounds = Math.log2(numberOfTeams);
  if (!Number.isInteger(totalRounds) || totalRounds < 1) {
    return [];
  }
  const matches: Omit<KnockoutMatch, 'ref'>[] = [];
  for (let r = 0; r < totalRounds; r++) {
    const matchCount = numberOfTeams / Math.pow(2, r + 1);
    for (let m = 0; m < matchCount; m++) {
      let team1Name = '';
      let team2Name = '';
      if (r > 0) {
        const prevRoundName = getRoundName(r - 1, totalRounds, translateFn);
        team1Name = translateFn('admin.finale.winnerOf', {
          round: prevRoundName,
          match: m * 2 + 1,
        });
        team2Name = translateFn('admin.finale.winnerOf', {
          round: prevRoundName,
          match: m * 2 + 2,
        });
      }
      matches.push({
        roundIndex: r,
        matchIndex: m,
        team1Name,
        team2Name,
      });
    }
  }
  return matches;
}

export function parseKnockoutMatch(
  data: Partial<KnockoutMatch>,
  ref: DocumentReference,
): KnockoutMatch {
  return {
    ...data,
    ref,
    date: parseFirestoreDate(data.date),
    finished: data.finished ?? false,
  } as KnockoutMatch;
}
