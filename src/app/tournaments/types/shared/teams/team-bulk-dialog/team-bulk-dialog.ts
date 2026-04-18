import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { Textarea } from 'primeng/textarea';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-team-bulk-dialog',
  imports: [FormsModule, FloatLabel, Textarea, Button, TranslocoPipe],
  templateUrl: './team-bulk-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamBulkDialog {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);

  bulkNames = signal('');

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const names = this.bulkNames()
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);
    if (names.length > 0) {
      this.dialogRef.close(names.map((name) => ({ ref: null! as DocumentReference, name })));
    }
  }
}
