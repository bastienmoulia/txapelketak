import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { Team } from '../../../../tournaments/types/shared/teams/teams';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Textarea } from 'primeng/textarea';
import { form, FormField, required } from '@angular/forms/signals';

@Component({
  selector: 'app-admin-teams',
  imports: [
    ButtonModule,
    TableModule,
    TranslocoModule,
    MessageModule,
    DialogModule,
    InputTextModule,
    FloatLabel,
    Textarea,
    FormField,
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
  visibleBulk = signal(false);

  team = signal<Team>({ id: '', name: '' });
  teamForm = form(this.team, (path) => {
    required(path.name);
  });

  onAddTeam(): void {
    this.visible.set(true);

    this.addTeam.emit();
  }

  onAddTeams(): void {
    this.visibleBulk.set(true);
  }

  onSaveTeam(): void {
    console.log('Saving team:', this.team());
    if (this.teamForm().valid()) {
      this.visible.set(false);
    }
  }

  onSaveTeams(): void {
    console.log('Saving multiple teams');
    this.visibleBulk.set(false);
  }

  onEditTeam(team: Team): void {
    this.editTeam.emit(team);
  }

  onDeleteTeam(team: Team): void {
    this.deleteTeam.emit(team);
  }
}
