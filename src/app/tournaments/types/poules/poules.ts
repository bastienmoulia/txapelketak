import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule } from '@jsverse/transloco';
import { ActivatedRoute } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
import { Teams } from '../shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { PoulesTab } from '../shared/poules-tab/poules-tab';
import { Games } from '../shared/games/games';
import { getPoulesRouteTab, POULES_ROUTE_TABS, POULES_TAB_QUERY_PARAM } from './poules.route';
import { TournamentDashboard } from '../shared/dashboard/tournament-dashboard';
import { PoulesStore } from '../../../store/poules.store';
import { FinaleTab } from '../shared/finale-tab/finale-tab';

export type { PoulesData, Serie, Poule, Game, TimeSlot, FinaleGame } from './poules.model';
export { parseFirestoreDate } from './poules.model';

@Component({
  selector: 'app-poules',
  imports: [TabsModule, Teams, TranslocoModule, PoulesTab, Games, TournamentDashboard, FinaleTab],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  private poulesStore = inject(PoulesStore);
  private activatedRoute = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();
  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  timeSlots = this.poulesStore.timeSlots;
  loading = this.poulesStore.loading;

  showPoules = computed(() => ['poules', 'poules_finale'].includes(this.tournament().type));
  showFinale = computed(() => ['finale', 'poules_finale'].includes(this.tournament().type));

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: POULES_ROUTE_TABS[0] },
  );

  activeTab = computed(() => this.tabFromUrl());

  teamsWithContext = computed(() => {
    const teams = this.teams();
    const series = this.series();
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
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.poulesStore.stopWatching());

    effect(() => {
      this.poulesStore.startWatching(this.tournament().ref);
    });
  }
}
