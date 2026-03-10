import { Routes } from "@angular/router";
import { Home } from "./home/home";
import { TournamentNew } from "./tournaments/new/tournament-new";

export const routes: Routes = [
  { path: "", component: Home },
  { path: "tournaments/new", component: TournamentNew },
];
