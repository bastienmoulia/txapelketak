import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../home/tournament.interface';
import { TournamentsTable } from '../../shared/tournaments-table/tournaments-table';
import { FirebaseService } from '../../shared/services/firebase.service';

@Component({
  selector: 'app-tournament-list',
  imports: [RouterLink, ButtonModule, TournamentsTable, TranslocoModule],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentList {
  firebaseService = inject(FirebaseService);
  tournaments = signal<Tournament[]>([]);

  constructor() {
    this.firebaseService
      .watchTournaments()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.tournaments.set(data);
      });
  }

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.id}`;
  }
}
