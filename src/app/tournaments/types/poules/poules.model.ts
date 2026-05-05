import { DocumentReference } from '@angular/fire/firestore';
import { Team } from '../shared/teams/teams';

export interface TimeSlot {
  ref: DocumentReference;
  date: Date;
}

export interface PoulesData {
  teams?: Team[];
  series?: Serie[];
}

export interface FinaleGame {
  ref: DocumentReference;
  name: string;
  round: string;
  roundOrder: number;
  matchNumber: number;
  refTeam1?: DocumentReference | null;
  refTeam2?: DocumentReference | null;
  team1Placeholder?: string;
  team2Placeholder?: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  date?: Date;
  referees?: string[];
}

export interface Serie {
  ref: DocumentReference;
  name: string;
  poules: Poule[];
  finaleSize?: number;
  finaleGames?: FinaleGame[];
}

export interface Poule {
  ref: DocumentReference;
  name: string;
  refTeams: DocumentReference[];
  games?: Game[];
}

export interface Game {
  ref: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number;
  scoreTeam2?: number;
  date?: Date;
  referees?: string[];
  comment?: string;
}

export function parseFirestoreDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}
