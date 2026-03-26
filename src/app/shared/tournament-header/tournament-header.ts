import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Tournament, UserRole } from '../../home/tournament.interface';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { RoleBadge } from '../role-badge/role-badge';

@Component({
  selector: 'app-tournament-header',
  imports: [
    ButtonModule,
    TranslocoPipe,
    ToastModule,
    RoleBadge,
  ],
  providers: [MessageService],
  templateUrl: './tournament-header.html',
  styleUrl: './tournament-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentHeader {
  #messageService = inject(MessageService);
  #translocoService = inject(TranslocoService);

  tournament = input.required<Tournament>();
  role = input<UserRole | ''>('');

  creator = computed(() => this.resolveCreator(this.tournament()));

  edit(): void {
    this.#messageService.add({
      severity: 'info',
      summary: this.#translocoService.translate('shared.tournamentHeader.editSummary'),
      detail: this.#translocoService.translate('shared.tournamentHeader.editDetail'),
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
