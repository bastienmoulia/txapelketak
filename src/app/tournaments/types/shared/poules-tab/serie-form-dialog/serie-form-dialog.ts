import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Serie } from '../../../poules/poules';

export interface SaveSerieEvent {
  name: string;
  ref?: DocumentReference;
}

interface SerieFormDialogData {
  isEditing: boolean;
  serieName: string;
  editingSerie: Serie | null;
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
}
