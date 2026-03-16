import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { Team } from '../../../../tournaments/types/shared/teams/teams';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-admin-teams',
  imports: [
    ButtonModule,
    TableModule,
    TranslocoModule,
    MessageModule,
    DialogModule,
    InputTextModule,
  ],
  templateUrl: './admin-teams.html',
  styleUrl: './admin-teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTeams {
  teams = input.required<Team[]>();

  addTeam = output<void>();
  editTeam = output<Team>();
  deleteTeam = output<Team>();

  visible = signal(false);

  onAddTeam(): void {
    this.visible.set(true);

    this.addTeam.emit();
  }

  onEditTeam(team: Team): void {
    this.editTeam.emit(team);
  }

  onDeleteTeam(team: Team): void {
    this.deleteTeam.emit(team);
  }
}
