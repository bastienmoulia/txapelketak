import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface ImportConfirmDialogData {
  teamsCount: number;
  seriesCount: number;
}

@Component({
  selector: 'app-import-confirm-dialog',
  imports: [Button, TranslocoPipe],
  templateUrl: './import-confirm-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportConfirmDialog {
  private readonly config = inject(DynamicDialogConfig<ImportConfirmDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { teamsCount: 0, seriesCount: 0 };

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
