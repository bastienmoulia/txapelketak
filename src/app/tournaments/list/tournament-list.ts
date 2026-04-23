import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../home/tournament.interface';
import { TournamentsTable } from '../../shared/tournaments-table/tournaments-table';
import { TournamentsStore } from '../../store/tournaments.store';

@Component({
  selector: 'app-tournament-list',
  imports: [ButtonModule, RouterLink, TournamentsTable, TranslocoModule],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentList {
  tournamentsStore = inject(TournamentsStore);

  tournaments = this.tournamentsStore.tournaments;
  loading = this.tournamentsStore.loading;
  error = this.tournamentsStore.error;
  firebaseUnavailable = this.tournamentsStore.firebaseUnavailable;

  constructor() {
    this.tournamentsStore.ensureLoaded();
  }

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.ref.id}`;
  }
}
