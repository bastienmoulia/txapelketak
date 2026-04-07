import { inject } from '@angular/core';
import { Routes, ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { TournamentDetailStore } from './store/tournament-detail.store';

function tournamentNameTitleResolver(fallbackKey: string): ResolveFn<string> {
  return async (route) => {
    const tournamentId = route.paramMap.get('tournamentId');
    const translocoService = inject(TranslocoService);
    const tournamentDetailStore = inject(TournamentDetailStore);

    if (!tournamentId) {
      return translocoService.translate(fallbackKey);
    }

    const tournamentName = await tournamentDetailStore.loadTournamentName(tournamentId);

    return tournamentName || translocoService.translate(fallbackKey);
  };
}

const tournamentDetailTitleResolver = tournamentNameTitleResolver('routes.tournamentDetail');
const tournamentAdminTitleResolver = tournamentNameTitleResolver('routes.admin');

export const routes: Routes = [
  {
    path: '',
    title: 'routes.home',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'tournaments',
    loadComponent: () => import('./main/main').then((m) => m.Main),
    children: [
      {
        path: '',
        title: 'routes.tournaments',
        loadComponent: () =>
          import('./tournaments/list/tournament-list').then((m) => m.TournamentList),
      },
      {
        path: 'new',
        title: 'routes.tournamentNew',
        loadComponent: () =>
          import('./tournaments/new/tournament-new').then((m) => m.TournamentNew),
      },

      {
        path: ':tournamentId',
        title: tournamentDetailTitleResolver,
        loadComponent: () =>
          import('./tournaments/detail/tournament-detail').then((m) => m.TournamentDetail),
      },
      {
        path: ':tournamentId/:token',
        title: tournamentAdminTitleResolver,
        loadComponent: () => import('./admin/admin').then((m) => m.Admin),
      },
    ],
  },
];
