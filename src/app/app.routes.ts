import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'tournaments',
    loadComponent: () => import('./main/main').then((m) => m.Main),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./tournaments/list/tournament-list').then((m) => m.TournamentList),
      },
      {
        path: 'new',
        loadComponent: () =>
          import('./tournaments/new/tournament-new').then((m) => m.TournamentNew),
      },

      {
        path: ':tournamentId',
        loadComponent: () =>
          import('./tournaments/detail/tournament-detail').then((m) => m.TournamentDetail),
      },
      {
        path: ':tournamentId/:token',
        loadComponent: () => import('./admin/admin').then((m) => m.Admin),
      },
    ],
  },
];
