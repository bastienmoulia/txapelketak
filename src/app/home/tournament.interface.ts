export interface Tournament {
  id: string;
  name: string;
  description: string;
  type: TournamentType;
  status: TournamentStatus;
  creatorUsername?: string;
  creatorEmail?: string;
  manageToken?: string;
  createdAt?: string;
  teams?: string[];
  groups?: string[];
  managers?: Manager[];
}

export interface Manager {
  username: string;
  email: string;
  token: string;
}

export type TournamentType = "poules" | "finale" | "poules+finale";

export type TournamentStatus =
  | "waitingValidation"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "archived";
