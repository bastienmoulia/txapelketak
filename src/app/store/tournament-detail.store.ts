import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { Tournament } from '../home/tournament.interface';
import { FirebaseService } from '../shared/services/firebase.service';

interface TournamentDetailState {
  tournament: Tournament | null;
  loading: boolean;
  notFound: boolean;
  activeTournamentId: string | null;
  error: string | null;
}

const initialState: TournamentDetailState = {
  tournament: null,
  loading: false,
  notFound: false,
  activeTournamentId: null,
  error: null,
};

export const TournamentDetailStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, firebaseService = inject(FirebaseService)) => {
    let tournamentSubscription: Subscription | null = null;
    let watchedTournamentId: string | null = null;

    return {
      startWatching(tournamentId: string): void {
        if (!tournamentId) {
          patchState(store, {
            tournament: null,
            loading: false,
            notFound: true,
            activeTournamentId: null,
            error: 'Missing tournament id',
          });
          return;
        }

        if (!firebaseService.isAvailable()) {
          patchState(store, {
            tournament: null,
            loading: false,
            notFound: true,
            activeTournamentId: tournamentId,
            error: null,
          });
          return;
        }

        if (tournamentSubscription && watchedTournamentId === tournamentId) {
          return;
        }

        tournamentSubscription?.unsubscribe();
        watchedTournamentId = tournamentId;

        patchState(store, {
          tournament: null,
          loading: true,
          notFound: false,
          activeTournamentId: tournamentId,
          error: null,
        });

        tournamentSubscription = firebaseService.watchTournamentById(tournamentId).subscribe({
          next: (tournament) => {
            patchState(store, {
              tournament,
              loading: false,
              notFound: !tournament,
              error: null,
            });
          },
          error: (error: unknown) => {
            tournamentSubscription = null;
            watchedTournamentId = null;
            patchState(store, {
              tournament: null,
              loading: false,
              notFound: false,
              error: error instanceof Error ? error.message : 'Unable to watch tournament detail',
            });
          },
          complete: () => {
            tournamentSubscription = null;
            watchedTournamentId = null;
          },
        });
      },

      stopWatching(): void {
        tournamentSubscription?.unsubscribe();
        tournamentSubscription = null;
        watchedTournamentId = null;
        patchState(store, initialState);
      },

      async loadTournamentName(tournamentId: string): Promise<string | null> {
        if (!tournamentId || !firebaseService.isAvailable()) {
          return null;
        }

        if (store.activeTournamentId() === tournamentId) {
          const cachedTournament = store.tournament();
          return cachedTournament?.name?.trim() || null;
        }

        const tournament = await firebaseService.getTournamentById(tournamentId);

        if (!tournament) {
          patchState(store, {
            tournament: null,
            notFound: true,
            loading: false,
            activeTournamentId: tournamentId,
            error: null,
          });
          return null;
        }

        patchState(store, {
          tournament,
          notFound: false,
          loading: false,
          activeTournamentId: tournamentId,
          error: null,
        });

        return tournament.name?.trim() || null;
      },
    };
  }),
);
