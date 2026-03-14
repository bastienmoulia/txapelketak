import type { FinaleData } from '../tournaments/types/finale/finale';
import type { PoulesFinaleData } from '../tournaments/types/poules-finale/poules-finale';
import type { PoulesData } from '../tournaments/types/poules/poules';

export interface Tournament<T extends TournamentType = TournamentType> {
  id: number;
  name: string;
  description: string;
  type: T;
  status: TournamentStatus;
  createdAt: string;
  data?: TournamentData<T>;
}

export interface User {
  tournamentId: number;
  username: string;
  email: string;
  token: string;
  rights: string[]; // e.g. ['admin', 'manager']
}

export type TournamentType = 'poules' | 'finale' | 'poules_finale';

export interface TournamentDataByType {
  poules: PoulesData;
  finale: FinaleData;
  poules_finale: PoulesFinaleData;
}

export type TournamentData<T extends TournamentType = TournamentType> = T extends keyof TournamentDataByType
  ? TournamentDataByType[T]
  : never;

export type TournamentStatus = 'waitingValidation' | 'paused' | 'ongoing' | 'archived';
