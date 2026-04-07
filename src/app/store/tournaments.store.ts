import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { Tournament } from '../home/tournament.interface';
import { FirebaseService } from '../shared/services/firebase.service';

interface TournamentsState {
  tournaments: Tournament[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  listenerStartCount: number;
}

const initialState: TournamentsState = {
  tournaments: [],
  loading: false,
  loaded: false,
  error: null,
  listenerStartCount: 0,
};

export const TournamentsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, firebaseService = inject(FirebaseService)) => {
    let tournamentsSubscription: Subscription | null = null;

    return {
      ensureLoaded(): void {
        if (store.loaded() || tournamentsSubscription) {
          return;
        }

        if (!firebaseService.isAvailable()) {
          patchState(store, {
            loading: false,
            loaded: true,
            tournaments: [],
            error: null,
          });
          return;
        }

        patchState(store, { loading: true, error: null });

        const listenerStartCount = store.listenerStartCount() + 1;
        patchState(store, { listenerStartCount });
        console.debug(
          `[Store] TournamentsStore.ensureLoaded: watchTournaments listener started (count=${listenerStartCount})`,
        );

        tournamentsSubscription = firebaseService.watchTournaments().subscribe({
          next: (tournaments) => {
            patchState(store, {
              tournaments,
              loading: false,
              loaded: true,
              error: null,
            });
          },
          error: (error: unknown) => {
            patchState(store, {
              loading: false,
              loaded: false,
              error: error instanceof Error ? error.message : 'Unable to load tournaments',
            });
          },
        });
      },
    };
  }),
);
