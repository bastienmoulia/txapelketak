import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { DocumentReference } from '@firebase/firestore';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { UserRole } from '../../../../home/tournament.interface';
import { Game, Serie } from '../../poules/poules';

export interface TeamUpcomingGame {
  team1Name: string;
  team2Name: string;
  date: Date;
  serieName: string;
  pouleName: string;
}

export interface TeamPlayedGame {
  team1Name: string;
  team2Name: string;
  scoreTeam1: number;
  scoreTeam2: number;
  date: Date | undefined;
  serieName: string;
  pouleName: string;
}

export interface Team {
  ref: DocumentReference;
  name: string;
  serieName?: string;
  pouleName?: string;
}

@Component({
  selector: 'app-teams',
  imports: [
    TableModule,
    TranslocoModule,
    MessageModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    FloatLabel,
    Textarea,
    FormField,
    FormsModule,
    DatePipe,
  ],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams {
  teams = input.required<Team[]>();
  role = input<UserRole | ''>('');
  series = input<Serie[]>([]);

  saveTeam = output<Team>();
  saveTeams = output<Team[]>();
  deleteTeam = output<Team>();

  visible = signal(false);
  visibleBulk = signal(false);
  isEditing = signal(false);
  deleteConfirmVisible = signal(false);
  pendingDeleteTeam = signal<Team | null>(null);
  teamDetailVisible = signal(false);
  selectedTeam = signal<Team | null>(null);

  bulkText = signal('');

  team = signal<Team>({ ref: null!, name: '' });
  teamForm = form(this.team, (path) => {
    required(path.name);
  });

  teamUpcomingGames = computed((): TeamUpcomingGame[] => {
    const team = this.selectedTeam();
    if (!team?.ref?.id) return [];
    const now = new Date();
    const upcoming: TeamUpcomingGame[] = [];
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (
            game.date &&
            new Date(game.date) > now &&
            (game.refTeam1?.id === team.ref.id || game.refTeam2?.id === team.ref.id)
          ) {
            upcoming.push({
              team1Name: this.getTeamNameById(game.refTeam1),
              team2Name: this.getTeamNameById(game.refTeam2),
              date: new Date(game.date),
              serieName: serie.name,
              pouleName: poule.name,
            });
          }
        }
      }
    }
    return upcoming.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  teamPlayedGames = computed((): TeamPlayedGame[] => {
    const team = this.selectedTeam();
    if (!team?.ref?.id) return [];
    const played: TeamPlayedGame[] = [];
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (
            game.scoreTeam1 != null &&
            game.scoreTeam2 != null &&
            (game.refTeam1?.id === team.ref.id || game.refTeam2?.id === team.ref.id)
          ) {
            played.push({
              team1Name: this.getTeamNameById(game.refTeam1),
              team2Name: this.getTeamNameById(game.refTeam2),
              scoreTeam1: game.scoreTeam1,
              scoreTeam2: game.scoreTeam2,
              date: game.date ? new Date(game.date) : undefined,
              serieName: serie.name,
              pouleName: poule.name,
            });
          }
        }
      }
    }
    return played.sort((a, b) => {
      if (a.date && b.date) return b.date.getTime() - a.date.getTime();
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });
  });

  onAddTeam(): void {
    this.isEditing.set(false);
    this.team.set({ ref: null!, name: '' });
    this.visible.set(true);
  }

  onViewTeam(team: Team): void {
    this.selectedTeam.set(team);
    this.teamDetailVisible.set(true);
  }

  onAddTeams(): void {
    this.bulkText.set('');
    this.visibleBulk.set(true);
  }

  onSaveTeam(): void {
    if (this.teamForm().valid()) {
      this.saveTeam.emit(this.team());
      this.visible.set(false);
    }
  }

  onSaveTeams(): void {
    const names = this.bulkText()
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    const newTeams: Team[] = names.map((name) => ({ ref: null!, name }));
    this.saveTeams.emit(newTeams);
    this.visibleBulk.set(false);
  }

  onEditTeam(team: Team): void {
    this.isEditing.set(true);
    this.team.set({ ...team });
    this.visible.set(true);
  }

  onDeleteTeam(team: Team): void {
    this.pendingDeleteTeam.set(team);
    this.deleteConfirmVisible.set(true);
  }

  onConfirmDeleteTeam(): void {
    const team = this.pendingDeleteTeam();
    if (team) {
      this.deleteTeam.emit(team);
      this.pendingDeleteTeam.set(null);
    }
    this.deleteConfirmVisible.set(false);
  }

  onCancelDeleteTeam(): void {
    this.pendingDeleteTeam.set(null);
    this.deleteConfirmVisible.set(false);
  }

  private getTeamNameById(ref: Game['refTeam1'] | Game['refTeam2'] | undefined): string {
    if (!ref?.id) return '?';
    return this.teams().find((t) => t.ref?.id === ref.id)?.name ?? '?';
  }
}
