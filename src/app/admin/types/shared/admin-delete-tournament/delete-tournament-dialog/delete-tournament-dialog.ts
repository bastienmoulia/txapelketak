import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface DeleteTournamentDialogData {
  tournamentName: string;
}

@Component({
  selector: 'app-delete-tournament-dialog',
  imports: [FormsModule, FloatLabel, InputTextModule, MessageModule, Button, TranslocoPipe],
  templateUrl: './delete-tournament-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteTournamentDialog {
  private readonly config = inject(DynamicDialogConfig<DeleteTournamentDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  tournamentName = this.config.data?.tournamentName ?? '';
  confirmationName = signal('');

  isConfirmDisabled = computed(
    () => this.confirmationName().trim() !== this.tournamentName,
  );

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onConfirm(): void {
    if (this.isConfirmDisabled()) {
      return;
    }
    this.dialogRef.close(true);
  }
}
