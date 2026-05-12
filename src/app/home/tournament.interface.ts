import type { DocumentReference } from '@angular/fire/firestore';
import type { PoulesData } from '../tournaments/types/poules/poules';

export interface Tournament<T extends TournamentType = TournamentType> {
  ref: DocumentReference;
  name: string;
  description: string;
  gameDurationMinutes?: number | null;
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
  role: UserRole;
}

export type UserRole = 'admin' | 'organizer';

export type TournamentType = 'poules' | 'finale' | 'poules_finale';

export interface TournamentDataByType {
  poules: PoulesData;
  finale: PoulesData;
  poules_finale: PoulesData;
}

export type TournamentData<T extends TournamentType = TournamentType> =
  T extends keyof TournamentDataByType ? TournamentDataByType[T] : never;

export type TournamentStatus = 'waitingValidation' | 'ongoing' | 'archived';
