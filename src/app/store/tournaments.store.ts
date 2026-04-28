import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { Subscription } from 'rxjs';
import { Tournament } from '../home/tournament.interface';
import { FirebaseService } from '../shared/services/firebase.service';

interface TournamentsState {
  tournaments: Tournament[];
  loading: boolean;
  loaded: boolean;
  firstSnapshotReceived: boolean;
  firebaseUnavailable: boolean;
  error: string | null;
  listenerStartCount: number;
}

const initialState: TournamentsState = {
  tournaments: [],
  loading: false,
  loaded: false,
  firstSnapshotReceived: false,
  firebaseUnavailable: false,
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
        if (tournamentsSubscription) {
          return;
        }

        if (!firebaseService.isAvailable()) {
          patchState(store, {
            loading: false,
            loaded: false,
            firstSnapshotReceived: false,
            firebaseUnavailable: true,
            tournaments: [],
            error: 'Firebase unavailable',
          });
          return;
        }

        patchState(store, { loading: true, firebaseUnavailable: false, error: null });

        const listenerStartCount = store.listenerStartCount() + 1;
        patchState(store, { listenerStartCount });
        console.debug(
          `[Store] TournamentsStore.ensureLoaded: watchTournaments listener started (count=${listenerStartCount})`,
        );

        const showHidden =
          typeof localStorage !== 'undefined' && localStorage.getItem('showHidden') === 'true';
        tournamentsSubscription = firebaseService.watchTournaments(showHidden).subscribe({
          next: (tournaments) => {
            patchState(store, {
              tournaments,
              loading: false,
              loaded: true,
              firstSnapshotReceived: true,
              firebaseUnavailable: false,
              error: null,
            });
          },
          error: (error: unknown) => {
            tournamentsSubscription = null;
            patchState(store, {
              loading: false,
              loaded: false,
              firstSnapshotReceived: true,
              firebaseUnavailable: false,
              error: error instanceof Error ? error.message : 'Unable to load tournaments',
            });
          },
          complete: () => {
            tournamentsSubscription = null;
            patchState(store, {
              loading: false,
            });
          },
        });
      },
    };
  }),
);
