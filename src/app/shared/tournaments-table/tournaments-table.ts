import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tournament } from '../../home/tournament.interface';

@Component({
  selector: 'app-tournaments-table',
  imports: [
    RouterLink,
    ButtonModule,
    TableModule,
    TranslocoModule,
  ],
  templateUrl: './tournaments-table.html',
  styleUrl: './tournaments-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentsTable {
  tournaments = input.required<Tournament[]>();
  loading = input(false);
  getTournamentLink = input.required<(tournament: Tournament) => string>();

  visibleTournaments = computed(() =>
    this.tournaments().filter((tournament) => tournament.status !== 'waitingValidation'),
  );
}
