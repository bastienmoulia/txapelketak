import { Routes } from '@angular/router';

export const tournamentAdminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./admin').then((m) => m.Admin),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../tournaments/shared/dashboard/tournament-dashboard').then(
            (m) => m.TournamentDashboard,
          ),
      },
      {
        path: 'teams',
        loadComponent: () => import('../tournaments/shared/teams/teams').then((m) => m.Teams),
      },
      {
        path: 'poules',
        redirectTo: 'phases',
        pathMatch: 'full',
      },
      {
        path: 'phases',
        loadComponent: () => import('../tournaments/shared/phases/phases').then((m) => m.Phases),
      },
      {
        path: 'games',
        loadComponent: () => import('../tournaments/shared/games/games').then((m) => m.Games),
      },
      {
        path: 'settings',
        loadComponent: () => import('./types/shared/settings/settings').then((m) => m.Settings),
      },
    ],
  },
];
