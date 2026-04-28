import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Tournament, UserRole } from '../../home/tournament.interface';
import { TabsModule } from 'primeng/tabs';
import { TranslocoPipe } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  getPoulesRouteTab,
  POULES_TAB_QUERY_PARAM,
  POULES_ROUTE_TABS,
} from '../../tournaments/types/poules/poules.route';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-tournament-tabs',
  imports: [TabsModule, TranslocoPipe],
  templateUrl: './tournament-tabs.html',
  styleUrl: './tournament-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentTabs {
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);

  tournament = input.required<Tournament>();
  role = input<UserRole | ''>('');

  tabs = computed(() => {
    const tabs = [
      { route: 'dashboard', label: 'tournaments.dashboard.tab' },
      { route: 'games', label: 'admin.tabs.games' },
      { route: 'teams', label: 'admin.tabs.teams' },
    ];

    if (['poules', 'poules_finale'].includes(this.tournament().type)) {
      tabs.push({ route: 'poules', label: 'admin.tabs.poules' });
    }

    if (['finale', 'poules_finale'].includes(this.tournament().type)) {
      tabs.push({ route: 'finale', label: 'admin.tabs.finale' });
    }

    if (this.role() === 'admin') {
      tabs.push({ route: 'administration', label: 'admin.tabs.administration' });
    }

    return tabs;
  });

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: POULES_ROUTE_TABS[0] },
  );

  activeTab = computed(() => this.tabFromUrl());

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
