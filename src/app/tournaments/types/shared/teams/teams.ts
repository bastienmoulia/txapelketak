import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
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
import { RouterLink } from '@angular/router';

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
    RouterLink,
  ],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams {
  teams = input.required<Team[]>();
  role = input<UserRole | ''>('');

  saveTeam = output<Team>();
  saveTeams = output<Team[]>();
  deleteTeam = output<Team>();

  visible = signal(false);
  visibleBulk = signal(false);
  isEditing = signal(false);
  deleteConfirmVisible = signal(false);
  pendingDeleteTeam = signal<Team | null>(null);
  editingTeamRef = signal<DocumentReference | null>(null);

  bulkText = signal('');

  team = signal<Team>({ ref: null!, name: '' });
  teamForm = form(this.team, (path) => {
    required(path.name);
  });

  onAddTeam(): void {
    this.isEditing.set(false);
    this.editingTeamRef.set(null);
    this.team.set({ ref: null!, name: '' });
    this.visible.set(true);
  }

  onAddTeams(): void {
    this.bulkText.set('');
    this.visibleBulk.set(true);
  }

  onSaveTeam(): void {
    if (this.teamForm().valid()) {
      const team = this.team();
      this.saveTeam.emit({
        ref: this.editingTeamRef() ?? team.ref,
        name: team.name,
      });
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
    this.editingTeamRef.set(team.ref);
    this.team.set({ ref: team.ref, name: team.name });
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
}
