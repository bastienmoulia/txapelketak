import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Team } from '../../teams/teams';
import type { Poule } from '../../../poules/poules';

interface TeamPouleDialogData {
  poule: Poule;
  teams: Team[];
}

@Component({
  selector: 'app-team-poule-dialog',
  imports: [FormsModule, MultiSelectModule, Button, TranslocoPipe],
  templateUrl: './team-poule-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPouleDialog {
  private readonly config = inject(DynamicDialogConfig<TeamPouleDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data: TeamPouleDialogData = this.config.data ?? { poule: { ref: null!, name: '', refTeams: [] as DocumentReference[] }, teams: [] as Team[] };

  selectedTeamRefs = signal<DocumentReference[]>([]);

  availableTeams = computed(() =>
    this.data.teams
      .filter((t) => !this.data.poule.refTeams?.some((ref) => ref.id === t.ref.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const refs = this.selectedTeamRefs();
    if (refs.length === 0) return;
    this.dialogRef.close(refs);
  }
}
