import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Tournament } from '../../home/tournament.interface';
import { TournamentStatusLabelPipe } from '../pipes/tournament-status-label.pipe';
import { TournamentStatusSeverityPipe } from '../pipes/tournament-status-severity.pipe';
import { TranslocoPipe } from '@jsverse/transloco';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-tournament-header',
  imports: [
    BadgeModule,
    ButtonModule,
    TagModule,
    TournamentStatusLabelPipe,
    TournamentStatusSeverityPipe,
    TranslocoPipe,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './tournament-header.html',
  styleUrl: './tournament-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentHeader {
  #messageService = inject(MessageService);

  tournament = input.required<Tournament>();
  admin = input<boolean>(false);
  detailsExpanded = signal(false);

  creator = computed(() => this.resolveCreator(this.tournament()));

  toggleDetails(): void {
    this.detailsExpanded.update((isExpanded) => !isExpanded);
  }

  edit(): void {
    this.#messageService.add({
      severity: 'info',
      summary: 'Modifier le tournoi',
      detail: "La fonctionnalité de modification n'est pas encore implémentée.",
    });
  }

  private resolveCreator(tournament: Tournament): string {
    const extendedTournament = tournament as Tournament & {
      createdBy?: string;
      creatorUsername?: string;
      creatorEmail?: string;
      owner?: { username?: string; email?: string };
    };

    return (
      this.firstNonEmpty(
        extendedTournament.createdBy,
        extendedTournament.creatorUsername,
        extendedTournament.owner?.username,
        extendedTournament.creatorEmail,
        extendedTournament.owner?.email,
      ) ?? '—'
    );
  }

  private firstNonEmpty(...values: (string | undefined)[]): string | undefined {
    return values.find((value) => Boolean(value?.trim()));
  }
}
