import { DocumentReference } from '@angular/fire/firestore';
import { Team } from './shared/teams/teams';

export interface TimeSlot {
  ref: DocumentReference;
  date: Date;
}

export interface PoulesData {
  teams?: Team[];
  series?: Serie[];
}

export interface Serie {
  ref: DocumentReference;
  name: string;
  poules: Poule[];
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
