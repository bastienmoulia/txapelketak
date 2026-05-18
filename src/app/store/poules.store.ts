import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { distinctUntilChanged, from, map, switchMap, Subscription } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { FirebaseService } from '../shared/services/firebase.service';
import { Game, Playoff, Poule, Serie, Team, TimeSlot } from '../tournaments/models';

interface PoulesStoreState {
  teams: Team[];
  series: Serie[];
  timeSlots: TimeSlot[];
  loading: boolean;
  activeTournamentId: string | null;
  error: string | null;
}

const initialState: PoulesStoreState = {
  teams: [],
  series: [],
  timeSlots: [],
  loading: false,
  activeTournamentId: null,
  error: null,
};

export const PoulesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    teamsWithContext: computed(() => {
      const teams = store.teams();
      const series = store.series();
      const contextMap = new Map<string, { serieName: string; pouleName: string }>();
      for (const serie of series) {
        for (const poule of serie.poules ?? []) {
          for (const ref of poule.refTeams ?? []) {
            contextMap.set(ref.id, { serieName: serie.name, pouleName: poule.name });
          }
        }
      }
      return teams.map((team) => {
        const context = team.ref?.id ? contextMap.get(team.ref.id) : undefined;
        return context ? { ...team, ...context } : team;
      });
    }),
  })),
  withMethods((store, firebaseService = inject(FirebaseService)) => {
    let teamsSubscription: Subscription | null = null;
    let seriesSubscription: Subscription | null = null;
    let timeSlotsSubscription: Subscription | null = null;
    const gameSubscriptionMap = new Map<string, Subscription>(); // key: poule ref ID
    const playoffCollectionSubscriptionMap = new Map<string, Subscription>(); // key: serie ref ID
    const playoffGameSubscriptionMap = new Map<string, Subscription>(); // key: playoff ref ID
    const pouleSubscriptions: Subscription[] = [];
    let watchedTournamentId: string | null = null;

    function stopGameWatchers(): void {
      gameSubscriptionMap.forEach((sub) => sub.unsubscribe());
      gameSubscriptionMap.clear();
    }

    function stopPlayoffCollectionWatchers(): void {
      playoffCollectionSubscriptionMap.forEach((sub) => sub.unsubscribe());
      playoffCollectionSubscriptionMap.clear();
    }

    function stopPlayoffGameWatchers(): void {
      playoffGameSubscriptionMap.forEach((sub) => sub.unsubscribe());
      playoffGameSubscriptionMap.clear();
    }

    function stopPouleWatchers(): void {
      pouleSubscriptions.forEach((s) => s.unsubscribe());
      pouleSubscriptions.length = 0;
    }

    function resetWatchingState(): void {
      teamsSubscription?.unsubscribe();
      teamsSubscription = null;
      seriesSubscription?.unsubscribe();
      seriesSubscription = null;
      timeSlotsSubscription?.unsubscribe();
      timeSlotsSubscription = null;
      stopPouleWatchers();
      stopGameWatchers();
      stopPlayoffCollectionWatchers();
      stopPlayoffGameWatchers();
      watchedTournamentId = null;
    }

    function startGameWatcher(poule: Poule): void {
      if (gameSubscriptionMap.has(poule.ref.id)) {
        return;
      }
      const sub = firebaseService.watchCollectionFromDocumentRef(poule.ref, 'games').subscribe({
        next: (items) => {
          const games: Game[] = items.map((item) => {
            const data = item.data as Partial<Game>;
            return {
              ...data,
              ref: item.ref,
              date: firebaseService.parseFirestoreDate(data.date),
            } as Game;
          });
          patchState(store, {
            series: store.series().map((s) => ({
              ...s,
              poules: (s.poules ?? []).map((p) =>
                p.ref.id === poule.ref.id ? { ...p, games } : p,
              ),
            })),
            error: null,
          });
        },
        error: (err: unknown) => {
          patchState(store, {
            error: err instanceof Error ? err.message : 'Unable to watch games',
          });
        },
        complete: () => {
          gameSubscriptionMap.delete(poule.ref.id);
        },
      });
      gameSubscriptionMap.set(poule.ref.id, sub);
    }

    function startPlayoffGameWatcher(serieRef: DocumentReference, playoff: Playoff): void {
      if (playoffGameSubscriptionMap.has(playoff.ref.id)) {
        return;
      }

      const sub = firebaseService.watchCollectionFromDocumentRef(playoff.ref, 'games').subscribe({
        next: (items) => {
          const games: Game[] = items.map((item) => {
            const data = item.data as Partial<Game>;
            return {
              ...data,
              ref: item.ref,
              date: firebaseService.parseFirestoreDate(data.date),
            } as Game;
          });

          patchState(store, {
            series: store.series().map((serie) => {
              if (serie.ref.id !== serieRef.id) {
                return serie;
              }

              return {
                ...serie,
                playoffs: (serie.playoffs ?? []).map((currentPlayoff) =>
                  currentPlayoff.ref.id === playoff.ref.id
                    ? { ...currentPlayoff, games }
                    : currentPlayoff,
                ),
              };
            }),
            error: null,
          });
        },
        error: (err: unknown) => {
          patchState(store, {
            error: err instanceof Error ? err.message : 'Unable to watch playoff games',
          });
        },
        complete: () => {
          playoffGameSubscriptionMap.delete(playoff.ref.id);
        },
      });

      playoffGameSubscriptionMap.set(playoff.ref.id, sub);
    }

    function watchGames(series: Serie[]): void {
      stopGameWatchers();
      for (const serie of series) {
        for (const poule of serie.poules ?? []) {
          startGameWatcher(poule);
        }
      }
    }

    function syncPlayoffGameWatchers(
      serie: Serie,
      oldPlayoffs: Playoff[],
      newPlayoffs: Playoff[],
    ): void {
      const oldIds = new Set(oldPlayoffs.map((p) => p.ref.id));
      const newIds = new Set(newPlayoffs.map((p) => p.ref.id));

      for (const id of oldIds) {
        if (!newIds.has(id)) {
          playoffGameSubscriptionMap.get(id)?.unsubscribe();
          playoffGameSubscriptionMap.delete(id);
        }
      }

      for (const playoff of newPlayoffs) {
        if (!playoffGameSubscriptionMap.has(playoff.ref.id)) {
          startPlayoffGameWatcher(serie.ref, playoff);
        }
      }
    }

    function syncGameWatchers(oldPoules: Poule[], newPoules: Poule[]): void {
      const oldIds = new Set(oldPoules.map((p) => p.ref.id));
      const newIds = new Set(newPoules.map((p) => p.ref.id));

      for (const id of oldIds) {
        if (!newIds.has(id)) {
          gameSubscriptionMap.get(id)?.unsubscribe();
          gameSubscriptionMap.delete(id);
        }
      }

      for (const poule of newPoules) {
        if (!oldIds.has(poule.ref.id)) {
          startGameWatcher(poule);
        }
      }
    }

    function watchPoules(series: Serie[]): void {
      stopPouleWatchers();
      for (const serie of series) {
        const sub = firebaseService.watchCollectionFromDocumentRef(serie.ref, 'poules').subscribe({
          next: (items) => {
            const currentSeries = store.series();
            const currentSerie = currentSeries.find((s) => s.ref.id === serie.ref.id);
            const oldPoules = currentSerie?.poules ?? [];

            const poulesWithGames: Poule[] = items.map((item) => {
              const existingPoule = oldPoules.find((p) => p.ref.id === item.ref.id);
              return {
                ...(item.data as Partial<Poule>),
                ref: item.ref,
                games: existingPoule?.games ?? [],
              } as Poule;
            });

            const newSeries = currentSeries.map((s) =>
              s.ref.id === serie.ref.id ? { ...s, poules: poulesWithGames } : s,
            );
            patchState(store, { series: newSeries, error: null });
            syncGameWatchers(oldPoules, poulesWithGames);
          },
          error: (err: unknown) => {
            patchState(store, {
              error: err instanceof Error ? err.message : 'Unable to watch poules',
            });
          },
          complete: () => {
            const index = pouleSubscriptions.indexOf(sub);
            if (index >= 0) {
              pouleSubscriptions.splice(index, 1);
            }
          },
        });
        pouleSubscriptions.push(sub);
      }
    }

    function watchPlayoffs(series: Serie[]): void {
      stopPlayoffCollectionWatchers();
      stopPlayoffGameWatchers();

      for (const serie of series) {
        const sub = firebaseService
          .watchCollectionFromDocumentRef(serie.ref, 'playoffs')
          .subscribe({
            next: (items) => {
              const currentSeries = store.series();
              const currentSerie = currentSeries.find((s) => s.ref.id === serie.ref.id);
              const oldPlayoffs = currentSerie?.playoffs ?? [];

              const playoffsWithGames: Playoff[] = items.map((item) => {
                const existingPlayoff = oldPlayoffs.find((p) => p.ref.id === item.ref.id);
                return {
                  ...(item.data as Partial<Playoff>),
                  ref: item.ref,
                  games: existingPlayoff?.games ?? [],
                } as Playoff;
              });

              const newSeries = currentSeries.map((s) =>
                s.ref.id === serie.ref.id ? { ...s, playoffs: playoffsWithGames } : s,
              );

              patchState(store, { series: newSeries, error: null });
              syncPlayoffGameWatchers(serie, oldPlayoffs, playoffsWithGames);
            },
            error: (err: unknown) => {
              patchState(store, {
                error: err instanceof Error ? err.message : 'Unable to watch playoffs',
              });
            },
            complete: () => {
              playoffCollectionSubscriptionMap.delete(serie.ref.id);
            },
          });

        playoffCollectionSubscriptionMap.set(serie.ref.id, sub);
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
              stopPouleWatchers();
              stopPlayoffCollectionWatchers();
              stopPlayoffGameWatchers();
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
              watchPoules(series);
              watchPlayoffs(series);
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

        // Time slots watcher
        timeSlotsSubscription = firebaseService.watchTimeSlots(tournamentRef).subscribe({
          next: (timeSlots) => {
            patchState(store, { timeSlots });
          },
          error: (err: unknown) => {
            patchState(store, {
              error: err instanceof Error ? err.message : 'Unable to watch timeSlots',
            });
          },
          complete: () => {
            timeSlotsSubscription = null;
          },
        });
      },

      stopWatching(): void {
        teamsSubscription?.unsubscribe();
        teamsSubscription = null;
        seriesSubscription?.unsubscribe();
        seriesSubscription = null;
        timeSlotsSubscription?.unsubscribe();
        timeSlotsSubscription = null;
        stopPouleWatchers();
        stopGameWatchers();
        stopPlayoffCollectionWatchers();
        stopPlayoffGameWatchers();
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
