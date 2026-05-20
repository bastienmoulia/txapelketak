import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import type { Playoff } from '../../../models';

export interface SavePlayoffEvent {
  ref: Playoff['ref'];
  name: string;
  hiddenFromVisitors?: boolean;
}

export interface DeletePlayoffAction {
  action: 'delete';
}

export type PlayoffEditDialogResult = SavePlayoffEvent | DeletePlayoffAction;

interface PlayoffEditDialogData {
  playoff: Playoff;
}

@Component({
  selector: 'app-playoff-edit-dialog',
  imports: [
    FormsModule,
    TranslocoPipe,
    Button,
    FloatLabel,
    InputTextModule,
    ToggleSwitchModule,
  ],
  templateUrl: './playoff-edit-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayoffEditDialog {
  private readonly config = inject(DynamicDialogConfig<PlayoffEditDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? { playoff: null! };

  playoffName = signal(this.data.playoff?.name ?? '');
  hiddenFromVisitors = signal(this.data.playoff?.hiddenFromVisitors ?? false);

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const name = this.playoffName().trim();
    if (!this.data.playoff?.ref) {
      return;
    }

    const result: SavePlayoffEvent = {
      ref: this.data.playoff.ref,
      name,
      hiddenFromVisitors: this.hiddenFromVisitors(),
    };
    this.dialogRef.close(result);
  }

  onDelete(): void {
    const result: DeletePlayoffAction = { action: 'delete' };
    this.dialogRef.close(result);
  }
}
