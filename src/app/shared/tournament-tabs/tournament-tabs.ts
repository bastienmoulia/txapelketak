import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Tournament, UserRole } from '../../home/tournament.interface';
import { TabsModule } from 'primeng/tabs';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-tournament-tabs',
  imports: [TabsModule, TranslocoPipe, RouterLink, RouterLinkActive],
  templateUrl: './tournament-tabs.html',
  styleUrl: './tournament-tabs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentTabs {
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
      tabs.push({ route: 'settings', label: 'admin.tabs.settings' });
    }

    return tabs;
  });
}
