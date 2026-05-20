import { DocumentReference } from '@angular/fire/firestore';

export interface TimeSlot {
  ref: DocumentReference;
  date: Date;
}

export interface Serie {
  ref: DocumentReference;
  name: string;
  poules?: Poule[];
  playoffs?: Playoff[];
  freePhases?: FreePhase[];
}

export interface Playoff {
  ref: DocumentReference;
  name: string;
  orderedTeamRefs: DocumentReference[];
  size: number;
  hiddenFromVisitors?: boolean;
  games?: Game[];
}

export interface FreePhase {
  ref: DocumentReference;
  name: string;
  games?: Game[];
}

export interface Poule {
  ref: DocumentReference;
  name: string;
  refTeams: DocumentReference[];
  hiddenFromVisitors?: boolean;
  games?: Game[];
}

export interface Game {
  ref: DocumentReference;
  refTeam1?: DocumentReference;
  refTeam2?: DocumentReference;
  scoreTeam1?: number;
  scoreTeam2?: number;
  date?: Date;
  referees?: string[];
  comment?: string;
  name?: string;
  roundSize?: number;
  matchNumber?: number;
}
