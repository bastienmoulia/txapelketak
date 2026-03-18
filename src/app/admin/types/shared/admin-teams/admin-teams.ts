import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
  ],
  templateUrl: './admin-teams.html',
  styleUrl: './admin-teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTeams {
  teams = input.required<Team[]>();

  saveTeam = output<Team>();
  saveTeams = output<Team[]>();
  deleteTeam = output<Team>();

  visible = signal(false);
  visibleBulk = signal(false);
  isEditing = signal(false);

  bulkText = signal('');

  team = signal<Team>({ ref: null!, name: '' });
  teamForm = form(this.team, (path) => {
    required(path.name);
  });

  onAddTeam(): void {
    this.isEditing.set(false);
    this.team.set({ ref: null!, name: '' });
    this.visible.set(true);
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
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
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
    this.deleteTeam.emit(team);
  }
}
