import { Routes } from '@angular/router';

export const tournamentDetailRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./tournament-detail').then((m) => m.TournamentDetail),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../types/shared/dashboard/tournament-dashboard').then(
            (m) => m.TournamentDashboard,
          ),
      },
      {
        path: 'teams',
        loadComponent: () => import('../types/shared/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'poules',
        loadComponent: () =>
          import('../types/shared/poules-tab/poules-tab').then((m) => m.PoulesTab),
      },
      {
        path: 'games',
        loadComponent: () => import('../types/shared/games/games').then((m) => m.Games),
      },
      {
        path: 'finale',
        loadComponent: () =>
          import('../types/shared/finale-tab/finale-tab').then((m) => m.FinaleTab),
      },
    ],
  },
];
