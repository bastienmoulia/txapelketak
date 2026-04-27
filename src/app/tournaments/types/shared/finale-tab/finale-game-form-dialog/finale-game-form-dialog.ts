import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { Select } from 'primeng/select';
import { TranslocoPipe } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { DocumentReference } from '@angular/fire/firestore';
import type { Team } from '../../../shared/teams/teams';
import type { UserRole } from '../../../../../home/tournament.interface';

interface FinaleGameFormDialogData {
  teams: Team[];
  role: UserRole | '';
  isEditing: boolean;
  gameRef?: DocumentReference | null;
  initialTeam1Ref?: DocumentReference | null;
  initialTeam2Ref?: DocumentReference | null;
  initialScoreTeam1?: number | null;
  initialScoreTeam2?: number | null;
  team1Placeholder?: string;
  team2Placeholder?: string;
}

export interface SaveFinaleGameEvent {
  gameRef: DocumentReference;
  refTeam1?: DocumentReference | null;
  refTeam2?: DocumentReference | null;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
}

@Component({
  selector: 'app-finale-game-form-dialog',
  imports: [FormsModule, FloatLabel, Select, InputNumberModule, Button, TranslocoPipe],
  templateUrl: './finale-game-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinaleGameFormDialog {
  private readonly config = inject(DynamicDialogConfig<FinaleGameFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? {
    teams: [],
    role: '' as UserRole | '',
    isEditing: false,
  };

  refTeam1 = signal<DocumentReference | null>(this.data.initialTeam1Ref ?? null);
  refTeam2 = signal<DocumentReference | null>(this.data.initialTeam2Ref ?? null);
  scoreTeam1 = signal<number | null>(this.data.initialScoreTeam1 ?? null);
  scoreTeam2 = signal<number | null>(this.data.initialScoreTeam2 ?? null);

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (!this.data.gameRef) return;
    const result: SaveFinaleGameEvent = {
      gameRef: this.data.gameRef,
      refTeam1: this.refTeam1(),
      refTeam2: this.refTeam2(),
      scoreTeam1: this.scoreTeam1(),
      scoreTeam2: this.scoreTeam2(),
    };
    this.dialogRef.close(result);
  }
}
