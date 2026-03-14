import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../home/tournament.interface';
import { TournamentsTable } from '../../shared/tournaments-table/tournaments-table';

@Component({
  selector: 'app-tournament-list',
  imports: [RouterLink, ButtonModule, TournamentsTable],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentList {
  firestore = inject(Firestore, { optional: true });
  tournaments = signal<Tournament[]>([]);

  constructor() {
    if (this.firestore) {
      const tournamentsCollection = collection(this.firestore, 'tournaments');
      collectionData(tournamentsCollection)
        .pipe(takeUntilDestroyed())
        .subscribe((data) => {
          this.tournaments.set(data as Tournament[]);
        });
    }
  }

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.id}`;
  }
}
