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
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
import { Teams } from '../shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { PoulesTab } from '../shared/poules-tab/poules-tab';
import { FinaleTab } from '../shared/finale-tab/finale-tab';
import { Games } from '../shared/games/games';
import { getPoulesRouteTab, POULES_ROUTE_TABS, POULES_TAB_QUERY_PARAM } from '../poules/poules.route';
import { TournamentDashboard } from '../shared/dashboard/tournament-dashboard';
import { PoulesStore } from '../../../store/poules.store';

export interface PoulesFinaleData {
  teams?: string[];
}

@Component({
  selector: 'app-poules-finale',
  imports: [TabsModule, Teams, TranslocoModule, PoulesTab, FinaleTab, Games, TournamentDashboard],
  templateUrl: './poules-finale.html',
  styleUrl: './poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoulesFinale {
  private poulesStore = inject(PoulesStore);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();
  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  timeSlots = this.poulesStore.timeSlots;
  loading = this.poulesStore.loading;

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

  onTabChange(nextTab: string | number | undefined): void {
    if (typeof nextTab !== 'string') {
      return;
    }

    const routeTab = getPoulesRouteTab(nextTab);
    if (routeTab === this.activeTab()) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [POULES_TAB_QUERY_PARAM]: routeTab },
      queryParamsHandling: 'merge',
    });
  }
}
