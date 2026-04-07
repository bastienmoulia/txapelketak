import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../home/tournament.interface';
import { TournamentsTable } from '../../shared/tournaments-table/tournaments-table';
import { MessageService } from 'primeng/api';
import { TournamentsStore } from '../../store/tournaments.store';

@Component({
  selector: 'app-tournament-list',
  imports: [ButtonModule, TournamentsTable, TranslocoModule],
  templateUrl: './tournament-list.html',
  styleUrl: './tournament-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class TournamentList {
  tournamentsStore = inject(TournamentsStore);
  messageService = inject(MessageService);
  translocoService = inject(TranslocoService);

  tournaments = this.tournamentsStore.tournaments;

  constructor() {
    this.tournamentsStore.ensureLoaded();
  }

  getTournamentLink(tournament: Tournament): string {
    return `/tournaments/${tournament.ref.id}`;
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
