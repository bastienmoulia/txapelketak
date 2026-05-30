import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DocumentReference } from '@angular/fire/firestore';

export interface SaveFreePhaseEvent {
  serieRef: DocumentReference;
  name: string;
  hiddenFromVisitors?: boolean;
  ref?: DocumentReference;
}

export interface DeleteFreePhaseAction {
  action: 'delete';
}

interface FreePhaseFormDialogData {
  serieRef: DocumentReference;
  name?: string;
  hiddenFromVisitors?: boolean;
  ref?: DocumentReference;
}

@Component({
  selector: 'app-free-phase-form-dialog',
  imports: [FormsModule, FloatLabel, InputTextModule, Button, TranslocoPipe, ToggleSwitchModule],
  templateUrl: './free-phase-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreePhaseFormDialog {
  private readonly config = inject(DynamicDialogConfig<FreePhaseFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { serieRef: null! };

  freePhaseName = signal(this.data.name ?? '');
  hiddenFromVisitors = signal(this.data.hiddenFromVisitors ?? false);

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (!this.data.serieRef) {
      return;
    }
    const result: SaveFreePhaseEvent = {
      serieRef: this.data.serieRef,
      name: this.freePhaseName().trim(),
      hiddenFromVisitors: this.hiddenFromVisitors(),
      ref: this.data.ref,
    };
    this.dialogRef.close(result);
  }

  onDelete(): void {
    const result: DeleteFreePhaseAction = { action: 'delete' };
    this.dialogRef.close(result);
  }
}
