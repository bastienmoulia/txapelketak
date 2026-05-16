import type { DocumentReference } from '@angular/fire/firestore';

export interface Tournament {
  ref: DocumentReference;
  name: string;
  description: string;
  status: TournamentStatus;
  createdAt: string;
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

export type TournamentStatus = 'waitingValidation' | 'ongoing' | 'archived';
