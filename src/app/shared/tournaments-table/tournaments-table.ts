import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { Tournament } from '../../home/tournament.interface';
import { TournamentStatusLabelPipe } from '../pipes/tournament-status-label.pipe';
import { TournamentStatusSeverityPipe } from '../pipes/tournament-status-severity.pipe';

@Component({
  selector: 'app-tournaments-table',
  imports: [
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    TournamentStatusLabelPipe,
    TournamentStatusSeverityPipe,
  ],
  templateUrl: './tournaments-table.html',
  styleUrl: './tournaments-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentsTable {
  tournaments = input.required<Tournament[]>();
  getTournamentLink = input.required<(tournament: Tournament) => string>();
}
