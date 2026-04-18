import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Poule } from '../../../poules/poules';
import type { SavePouleEvent } from '../poules-tab';

interface PouleFormDialogData {
  isEditing: boolean;
  pouleName: string;
  editingPoule: Poule | null;
  serieRef: DocumentReference;
}

@Component({
  selector: 'app-poule-form-dialog',
  imports: [FormsModule, FloatLabel, InputTextModule, Button, TranslocoPipe],
  templateUrl: './poule-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PouleFormDialog {
  private readonly config = inject(DynamicDialogConfig<PouleFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? {
    isEditing: false,
    pouleName: '',
    editingPoule: null,
    serieRef: null!,
  };

  pouleName = signal(this.data.pouleName);

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const name = this.pouleName().trim();
    if (!name) return;
    const result: SavePouleEvent = { serieRef: this.data.serieRef, name, ref: this.data.editingPoule?.ref };
    this.dialogRef.close(result);
  }
}
