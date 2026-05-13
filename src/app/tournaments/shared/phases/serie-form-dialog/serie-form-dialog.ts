import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { SaveSerieEvent } from '../phases';
import { Serie } from '../../../poules.model';

export interface DeleteSerieAction {
  action: 'delete';
}

export type SerieFormDialogResult = SaveSerieEvent | DeleteSerieAction;

interface SerieFormDialogData {
  isEditing: boolean;
  serieName: string;
  editingSerie: Serie | null;
  canDelete?: boolean;
}

@Component({
  selector: 'app-serie-form-dialog',
  imports: [FormsModule, FloatLabel, InputTextModule, Button, TranslocoPipe],
  templateUrl: './serie-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SerieFormDialog {
  private readonly config = inject(DynamicDialogConfig<SerieFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { isEditing: false, serieName: '', editingSerie: null };

  serieName = signal(this.data.serieName);

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const name = this.serieName().trim();
    if (!name) return;
    const result: SaveSerieEvent = { name, ref: this.data.editingSerie?.ref };
    this.dialogRef.close(result);
  }

  onDelete(): void {
    const result: DeleteSerieAction = { action: 'delete' };
    this.dialogRef.close(result);
  }
}
