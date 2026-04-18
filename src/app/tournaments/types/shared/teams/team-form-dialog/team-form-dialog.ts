import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface TeamFormDialogData {
  isEditing: boolean;
  team: { ref: DocumentReference; name: string };
}

@Component({
  selector: 'app-team-form-dialog',
  imports: [TranslocoPipe, FloatLabel, InputTextModule, FormField, Button],
  templateUrl: './team-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamFormDialog {
  private readonly config = inject(DynamicDialogConfig<TeamFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { isEditing: false, team: { ref: null!, name: '' } };

  team = signal<{ ref: DocumentReference; name: string }>(this.data.team);
  teamForm = form(this.team, (path) => {
    required(path.name);
  });

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (this.teamForm().valid()) {
      const team = this.team();
      this.dialogRef.close({ ref: team.ref, name: team.name });
    }
  }
}
