import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface TeamFormDialogData {
  isEditing: boolean;
  team: { ref: DocumentReference; name: string; comment?: string };
}

@Component({
  selector: 'app-team-form-dialog',
  imports: [TranslocoPipe, FloatLabel, InputTextModule, TextareaModule, FormsModule, Button],
  templateUrl: './team-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormDialog {
  private readonly config = inject(DynamicDialogConfig<TeamFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { isEditing: false, team: { ref: null!, name: '', comment: '' } };

  teamName = signal(this.data.team.name);
  teamComment = signal(this.data.team.comment ?? '');
  private readonly teamRef = this.data.team.ref;

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const name = this.teamName().trim();
    if (!name) return;
    this.dialogRef.close({ ref: this.teamRef, name, comment: this.teamComment().trim() || undefined });
  }
}
