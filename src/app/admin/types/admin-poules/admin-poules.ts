import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { AdminTeams } from '../shared/admin-teams/admin-teams';
import { Team } from '../../../tournaments/types/shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';

@Component({
  selector: 'app-admin-poules',
  imports: [TabsModule, AdminTeams, TranslocoModule],
  templateUrl: './admin-poules.html',
  styleUrl: './admin-poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoules {
  private firebaseService = inject(FirebaseService);

  tournament = input.required<Tournament>();
  teams = signal<Team[]>([]);
  private loadedTournamentId = signal<number | null>(null);

  constructor() {
    effect(() => {
      const tournament = this.tournament();
      this.teams.set((tournament.data?.teams as Team[] | undefined) ?? []);

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.id);
      void this.loadTeams(tournament.id);
    });
  }

  private async loadTeams(tournamentId: number): Promise<void> {
    const result = await this.firebaseService.getTournamentWithCollectionyId(tournamentId, 'teams');
    const teams = (result?.tournament.data?.teams as Team[] | undefined) ?? [];
    this.teams.set(teams);
  }
}
