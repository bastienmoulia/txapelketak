import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { AdminTeams } from '../shared/admin-teams/admin-teams';
import { Team } from '../../../tournaments/types/shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';

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
  private tournamentRef = signal<DocumentReference | null>(null);
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
    if (result) {
      this.tournamentRef.set(result.ref);
    }
    const teams = (result?.tournament.data?.teams as Team[] | undefined) ?? [];
    this.teams.set(teams);
  }

  async onSaveTeam(team: Team): Promise<void> {
    const ref = this.tournamentRef();
    if (!ref) {
      if (team.id) {
        this.teams.update((teams) => teams.map((t) => (t.id === team.id ? team : t)));
      } else {
        this.teams.update((teams) => [...teams, { ...team, id: crypto.randomUUID() }]);
      }
      return;
    }

    if (team.id) {
      await this.firebaseService.updateTeamInTournament(ref, team);
    } else {
      await this.firebaseService.addTeamToTournament(ref, team.name);
    }
    await this.loadTeams(this.tournament().id);
  }

  async onSaveTeams(teams: Team[]): Promise<void> {
    const ref = this.tournamentRef();
    if (!ref) {
      const newTeams = teams.map((t) => ({ ...t, id: crypto.randomUUID() }));
      this.teams.update((existing) => [...existing, ...newTeams]);
      return;
    }

    for (const team of teams) {
      await this.firebaseService.addTeamToTournament(ref, team.name);
    }
    await this.loadTeams(this.tournament().id);
  }

  async onDeleteTeam(team: Team): Promise<void> {
    const ref = this.tournamentRef();
    if (!ref) {
      this.teams.update((teams) => teams.filter((t) => t.id !== team.id));
      return;
    }

    await this.firebaseService.deleteTeamFromTournament(ref, team.id);
    await this.loadTeams(this.tournament().id);
  }
}
