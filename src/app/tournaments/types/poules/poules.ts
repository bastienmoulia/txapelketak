import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { Team } from '../shared/teams/teams';
import { Teams } from '../shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';

export interface PoulesData {
  teams?: Team[];
  series?: Series[];
}

export interface Series {
  id: string;
  name: string;
  poules: Poule[];
}

export interface Poule {
  id: string;
  name: string;
  idTeams: string[];
}

@Component({
  selector: 'app-poules',
  imports: [TabsModule, Teams, TranslocoModule],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
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
