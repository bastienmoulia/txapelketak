import { inject } from '@angular/core';
import { Routes, ResolveFn } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { FirebaseService } from './shared/services/firebase.service';

function tournamentNameTitleResolver(fallbackKey: string): ResolveFn<string> {
  return async (route) => {
    const tournamentId = route.paramMap.get('tournamentId');
    const translocoService = inject(TranslocoService);
    const firebaseService = inject(FirebaseService);

    if (!tournamentId || !firebaseService.isAvailable()) {
      return translocoService.translate(fallbackKey);
    }

    const tournament = await firebaseService.getTournamentById(tournamentId);

    return tournament?.name?.trim() || translocoService.translate(fallbackKey);
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
