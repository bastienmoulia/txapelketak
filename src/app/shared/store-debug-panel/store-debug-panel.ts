import { ChangeDetectionStrategy, Component, inject, isDevMode } from '@angular/core';
import { TournamentsStore } from '../../store/tournaments.store';
import { TournamentDetailStore } from '../../store/tournament-detail.store';
import { PoulesStore } from '../../store/poules.store';

@Component({
  selector: 'app-store-debug-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isDev) {
      <details
        class="fixed bottom-3 right-3 z-[9999] rounded-lg bg-black/85 text-green-300 text-[11px] font-mono max-w-[260px] shadow-xl border border-green-900/50"
        open
      >
        <summary class="cursor-pointer px-3 py-2 font-bold tracking-wide">🔧 Store Debug</summary>
        <div class="px-3 pb-3 flex flex-col gap-3 mt-1">
          <section>
            <p class="text-green-400 font-semibold mb-1">TournamentsStore</p>
            <ul class="space-y-0.5 text-green-200/80">
              <li>
                listeners:
                <span class="text-white">{{ tournamentsStore.listenerStartCount() }}</span>
              </li>
              <li>
                loaded: <span class="text-white">{{ tournamentsStore.loaded() }}</span>
              </li>
              <li>
                loading: <span class="text-white">{{ tournamentsStore.loading() }}</span>
              </li>
              <li>
                count: <span class="text-white">{{ tournamentsStore.tournaments().length }}</span>
              </li>
              @if (tournamentsStore.error()) {
                <li class="text-red-400">error: {{ tournamentsStore.error() }}</li>
              }
            </ul>
          </section>
          <section>
            <p class="text-green-400 font-semibold mb-1">TournamentDetailStore</p>
            <ul class="space-y-0.5 text-green-200/80">
              <li>
                id:
                <span class="text-white">{{
                  tournamentDetailStore.activeTournamentId() ?? '—'
                }}</span>
              </li>
              <li>
                loading: <span class="text-white">{{ tournamentDetailStore.loading() }}</span>
              </li>
              <li>
                notFound: <span class="text-white">{{ tournamentDetailStore.notFound() }}</span>
              </li>
              @if (tournamentDetailStore.error()) {
                <li class="text-red-400">error: {{ tournamentDetailStore.error() }}</li>
              }
            </ul>
          </section>
          <section>
            <p class="text-green-400 font-semibold mb-1">PoulesStore</p>
            <ul class="space-y-0.5 text-green-200/80">
              <li>
                id: <span class="text-white">{{ poulesStore.activeTournamentId() ?? '—' }}</span>
              </li>
              <li>
                loading: <span class="text-white">{{ poulesStore.loading() }}</span>
              </li>
              <li>
                series: <span class="text-white">{{ poulesStore.series().length }}</span>
              </li>
              <li>
                teams: <span class="text-white">{{ poulesStore.teams().length }}</span>
              </li>
              @if (poulesStore.error()) {
                <li class="text-red-400">error: {{ poulesStore.error() }}</li>
              }
            </ul>
          </section>
        </div>
      </details>
    }
  `,
})
export class StoreDebugPanel {
  readonly isDev = isDevMode();
  readonly tournamentsStore = inject(TournamentsStore);
  readonly tournamentDetailStore = inject(TournamentDetailStore);
  readonly poulesStore = inject(PoulesStore);
}
