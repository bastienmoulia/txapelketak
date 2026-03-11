export interface Tournament {
  id: number;
  name: string;
  description: string;
  type: TournamentType;
  status: TournamentStatus;
}

export type TournamentType = "poules" | "finale" | "poules+finale";

export type TournamentStatus =
  | "waitingValidation"
  | "upcoming"
  | "ongoing"
  | "completed"
  | "archived";
