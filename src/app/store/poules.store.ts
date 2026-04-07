import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { distinctUntilChanged, from, map, switchMap, Subscription } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { Team } from '../tournaments/types/shared/teams/teams';
import { Game, parseFirestoreDate, Poule, Serie } from '../tournaments/types/poules/poules.model';
import { FirebaseService } from '../shared/services/firebase.service';

interface PoulesStoreState {
  teams: Team[];
  series: Serie[];
  loading: boolean;
  activeTournamentId: string | null;
  error: string | null;
}

const initialState: PoulesStoreState = {
  teams: [],
  series: [],
  loading: false,
  activeTournamentId: null,
  error: null,
};

export const PoulesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, firebaseService = inject(FirebaseService)) => {
    let teamsSubscription: Subscription | null = null;
    let seriesSubscription: Subscription | null = null;
    const gameSubscriptions: Subscription[] = [];
    let watchedTournamentId: string | null = null;

    function stopGameWatchers(): void {
      gameSubscriptions.forEach((s) => s.unsubscribe());
      gameSubscriptions.length = 0;
    }

    function resetWatchingState(): void {
      teamsSubscription?.unsubscribe();
      teamsSubscription = null;
      seriesSubscription?.unsubscribe();
      seriesSubscription = null;
      stopGameWatchers();
      watchedTournamentId = null;
    }

    function watchGames(series: Serie[]): void {
      stopGameWatchers();
      for (const serie of series) {
        for (const poule of serie.poules ?? []) {
          const sub = firebaseService
            .watchCollectionFromDocumentRef(poule.ref, 'games')
            .subscribe((items) => {
              const games: Game[] = items.map((item) => {
                const data = item.data as Partial<Game>;
                return {
                  ...data,
                  ref: item.ref,
                  date: parseFirestoreDate(data.date),
                } as Game;
              });
              patchState(store, {
                series: store.series().map((s) => ({
                  ...s,
                  poules: (s.poules ?? []).map((p) =>
                    p.ref.id === poule.ref.id ? { ...p, games } : p,
                  ),
                })),
              });
            });
          gameSubscriptions.push(sub);
        }
      }
    }

    async function loadPoules(serieRef: DocumentReference): Promise<Poule[]> {
      const result = await firebaseService.getCollectionFromDocumentRef(serieRef, 'poules');
      return (result ?? []).map((item, index) => ({
        ...(item.data as Partial<Poule>),
        ref: result[index].ref,
        games: [],
      })) as Poule[];
    }

    return {
      startWatching(tournamentRef: DocumentReference): void {
        const tournamentId = tournamentRef.id;
        if (!firebaseService.isAvailable()) {
          patchState(store, {
            teams: [],
            series: [],
            loading: false,
            activeTournamentId: tournamentId,
            error: null,
          });
          return;
        }

        if (watchedTournamentId === tournamentId) {
          return;
        }

        resetWatchingState();
        watchedTournamentId = tournamentId;

        patchState(store, {
          loading: true,
          activeTournamentId: tournamentId,
          teams: [],
          series: [],
          error: null,
        });

        // Teams – watcher first emission provides the initial state (no separate getDocs)
        teamsSubscription = firebaseService
          .watchCollectionFromDocumentRef(tournamentRef, 'teams')
          .subscribe({
            next: (items) => {
              patchState(store, {
                teams: items.map((item) => ({
                  ...(item.data as Partial<Team>),
                  ref: item.ref,
                })) as Team[],
              });
            },
            error: (err: unknown) => {
              resetWatchingState();
              patchState(store, {
                loading: false,
                error: err instanceof Error ? err.message : 'Unable to watch teams',
              });
            },
            complete: () => {
              teamsSubscription = null;
            },
          });

        // Series structure – first emission provides initial data, subsequent trigger reload
        seriesSubscription = firebaseService
          .watchCollectionFromDocumentRef(tournamentRef, 'series')
          .pipe(
            map((items) => ({
              items,
              signature: items
                .map((item) => {
                  const data = item.data as Partial<Serie>;
                  return `${item.ref.id}:${data.name ?? ''}`;
                })
                .sort()
                .join('|'),
            })),
            distinctUntilChanged((a, b) => a.signature === b.signature),
            switchMap(({ items }) => {
              stopGameWatchers();
              const series = items.map((item) => ({
                ...(item.data as Partial<Serie>),
                ref: item.ref,
              })) as Serie[];
              return from(
                Promise.all(
                  series.map(async (serie) => ({
                    ...serie,
                    poules: await loadPoules(serie.ref),
                  })),
                ),
              );
            }),
          )
          .subscribe({
            next: (series) => {
              patchState(store, { series, loading: false });
              watchGames(series);
            },
            error: (err: unknown) => {
              resetWatchingState();
              patchState(store, {
                loading: false,
                error: err instanceof Error ? err.message : 'Unable to watch series',
              });
            },
            complete: () => {
              seriesSubscription = null;
            },
          });
      },

      stopWatching(): void {
        teamsSubscription?.unsubscribe();
        teamsSubscription = null;
        seriesSubscription?.unsubscribe();
        seriesSubscription = null;
        stopGameWatchers();
        watchedTournamentId = null;
        patchState(store, initialState);
      },

      patchTeams(teams: Team[]): void {
        patchState(store, { teams });
      },

      patchSeries(series: Serie[]): void {
        patchState(store, { series });
      },
    };
  }),
);
