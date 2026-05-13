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
          import('../shared/dashboard/tournament-dashboard').then((m) => m.TournamentDashboard),
      },
      {
        path: 'teams',
        loadComponent: () => import('../shared/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'poules',
        redirectTo: 'phases',
        pathMatch: 'full',
      },
      {
        path: 'phases',
        loadComponent: () => import('../shared/phases/phases').then((m) => m.Phases),
      },
      {
        path: 'games',
        loadComponent: () => import('../shared/games/games').then((m) => m.Games),
      },
    ],
  },
];
