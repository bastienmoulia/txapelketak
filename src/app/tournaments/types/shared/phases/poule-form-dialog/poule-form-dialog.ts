import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Poule } from '../../../poules/poules.model';
import type { SavePouleEvent } from '../phases';
import type { Team } from '../../teams/teams';

export interface DeletePouleAction {
  action: 'delete';
}

export type PouleFormDialogResult = SavePouleEvent | DeletePouleAction;

interface PouleFormDialogData {
  isEditing: boolean;
  pouleName: string;
  editingPoule: Poule | null;
  serieRef: DocumentReference;
  teams: Team[];
}

@Component({
  selector: 'app-poule-form-dialog',
  imports: [
    FormsModule,
    FloatLabel,
    InputTextModule,
    Button,
    TranslocoPipe,
    Select,
    Message,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './poule-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PouleFormDialog {
  private readonly config = inject(DynamicDialogConfig<PouleFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translocoService = inject(TranslocoService);

  data = this.config.data ?? {
    isEditing: false,
    pouleName: '',
    editingPoule: null,
    serieRef: null!,
    teams: [],
  };

  pouleName = signal(this.data.pouleName);
  pendingTeamRef = signal<DocumentReference | null>(null);
  selectedTeamRefs = signal<DocumentReference[]>(this.data.editingPoule?.refTeams ?? []);

  selectedTeams = computed(() => {
    const teamsById = new Map<string, Team>(
      this.data.teams.map((team: Team): [string, Team] => [team.ref.id, team]),
    );
    return this.selectedTeamRefs().map((teamRef) => ({
      ref: teamRef,
      name:
        teamsById.get(teamRef.id)?.name ??
        this.translocoService.translate('admin.poules.unknownTeam'),
    }));
  });

  availableTeams = computed(() => {
    const selectedIds = new Set(this.selectedTeamRefs().map((teamRef) => teamRef.id));
    return this.data.teams
      .filter((team: Team) => !selectedIds.has(team.ref.id))
      .sort((teamA: Team, teamB: Team) => teamA.name.localeCompare(teamB.name));
  });

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onAddSelectedTeam(): void {
    const teamRef = this.pendingTeamRef();
    if (!teamRef) return;

    const hasTeamAlready = this.selectedTeamRefs().some(
      (currentRef) => currentRef.id === teamRef.id,
    );
    if (hasTeamAlready) return;

    this.selectedTeamRefs.update((teamRefs) => [...teamRefs, teamRef]);
    this.pendingTeamRef.set(null);
  }

  onRequestRemoveTeam(teamRef: DocumentReference): void {
    const removeTeam = () => {
      this.selectedTeamRefs.update((teamRefs) =>
        teamRefs.filter((currentRef) => currentRef.id !== teamRef.id),
      );
    };

    if (!this.data.isEditing || !this.data.editingPoule) {
      removeTeam();
      return;
    }

    const teamName = this.selectedTeams().find((team) => team.ref.id === teamRef.id)?.name;
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', {
        name: teamName ?? this.translocoService.translate('admin.poules.unknownTeam'),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: removeTeam,
    });
  }

  onSave(): void {
    const name = this.pouleName().trim();
    if (!name) return;
    const result: SavePouleEvent = {
      serieRef: this.data.serieRef,
      name,
      ref: this.data.editingPoule?.ref,
      teamRefs: this.selectedTeamRefs(),
    };
    this.dialogRef.close(result);
  }

  onDelete(): void {
    const result: DeletePouleAction = { action: 'delete' };
    this.dialogRef.close(result);
  }
}
