import type { DocumentReference } from '@angular/fire/firestore';
import type { FinaleData } from '../tournaments/types/finale/finale';
import type { PoulesFinaleData } from '../tournaments/types/poules-finale/poules-finale';
import type { PoulesData } from '../tournaments/types/poules/poules';

export interface Tournament<T extends TournamentType = TournamentType> {
  ref: DocumentReference;
  name: string;
  description: string;
  type: T;
  status: TournamentStatus;
  createdAt: string;
  data?: TournamentData<T>;
}

export interface User {
  ref?: DocumentReference;
  refTournament: DocumentReference;
  username: string;
  email: string;
  token: string;
  role: string; // e.g. 'admin' | 'organizer'
}

export type TournamentType = 'poules' | 'finale' | 'poules_finale';

export interface TournamentDataByType {
  poules: PoulesData;
  finale: FinaleData;
  poules_finale: PoulesFinaleData;
}

export type TournamentData<T extends TournamentType = TournamentType> =
  T extends keyof TournamentDataByType ? TournamentDataByType[T] : never;

export type TournamentStatus = 'waitingValidation' | 'paused' | 'ongoing' | 'archived';
