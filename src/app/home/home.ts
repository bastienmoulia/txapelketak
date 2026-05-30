import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Tournament } from './tournament.interface';
import { TournamentsTable } from '../shared/tournaments-table/tournaments-table';
import { HeaderActions } from '../shared/header-actions/header-actions';
import { TournamentsStore } from '../store/tournaments.store';
import { LucideAngularModule } from 'lucide-angular';

interface Feature {
  icon: string;
  titleKey: string;
  descriptionKey: string;
}

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, RouterLink, ButtonModule, CardModule, TournamentsTable, HeaderActions, TranslocoModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  tournamentsStore = inject(TournamentsStore);
  tournaments = this.tournamentsStore.tournaments;
  loading = this.tournamentsStore.loading;
  error = this.tournamentsStore.error;
  firebaseUnavailable = this.tournamentsStore.firebaseUnavailable;

  recentTournaments = computed(() =>
    [...this.tournaments()]
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5),
  );

  constructor() {
    this.tournamentsStore.ensureLoaded();
  }

  features = signal<Feature[]>([
    {
      icon: 'trophy',
      titleKey: 'home.features.createTournament.title',
      descriptionKey: 'home.features.createTournament.description',
    },
    {
      icon: 'users',
      titleKey: 'home.features.managePlayers.title',
      descriptionKey: 'home.features.managePlayers.description',
    },
    {
      icon: 'chart-bar',
      titleKey: 'home.features.followScores.title',
      descriptionKey: 'home.features.followScores.description',
    },
    {
      icon: 'link',
      titleKey: 'home.features.urlAccess.title',
      descriptionKey: 'home.features.urlAccess.description',
    },
    {
      icon: 'badge-euro',
      titleKey: 'home.features.free.title',
      descriptionKey: 'home.features.free.description',
    },
    {
      icon: 'code-xml',
      titleKey: 'home.features.openSource.title',
      descriptionKey: 'home.features.openSource.description',
    },
  ]);

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.ref.id}`;
  }
}
