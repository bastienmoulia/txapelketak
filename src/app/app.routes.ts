import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./home/home").then((m) => m.Home),
  },
  {
    path: "tournaments/new",
    loadComponent: () =>
      import("./tournaments/new/tournament-new").then((m) => m.TournamentNew),
  },
  {
    path: "tournaments",
    loadComponent: () =>
      import("./tournaments/list/tournament-list").then(
        (m) => m.TournamentList,
      ),
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./tournaments/detail/tournament-detail").then(
        (m) => m.TournamentDetail,
      ),
  },
];
