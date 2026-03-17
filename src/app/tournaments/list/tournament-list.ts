import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../home/tournament.interface';
import { TournamentsTable } from '../../shared/tournaments-table/tournaments-table';
import { FirebaseService } from '../../shared/services/firebase.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-tournament-list',
  imports: [ButtonModule, TournamentsTable, TranslocoModule],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class TournamentList {
  firebaseService = inject(FirebaseService);
  messageService = inject(MessageService);
  translocoService = inject(TranslocoService);

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

  createSoonAvailable(): void {
    this.messageService.add({
      severity: 'info',
      summary: this.translocoService.translate('home.createSoonAvailable.title'),
      detail: this.translocoService.translate('home.createSoonAvailable.detail'),
      life: 3000,
    });
  }
}
