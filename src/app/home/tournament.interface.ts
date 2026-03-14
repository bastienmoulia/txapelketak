export interface Tournament {
  id: number;
  name: string;
  description: string;
  type: TournamentType;
  status: TournamentStatus;
  createdAt: string;
  data?: any;
}

export interface User {
  tournamentId: number;
  username: string;
  email: string;
  token: string;
  rights: string[]; // e.g. ['admin', 'manager']
}

export type TournamentType = 'poules' | 'finale' | 'poules_finale';

export type TournamentStatus = 'waitingValidation' | 'paused' | 'ongoing' | 'archived';
