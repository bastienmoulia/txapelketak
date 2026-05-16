import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Message } from 'primeng/message';
import { FloatLabel } from 'primeng/floatlabel';
import { InputMaskModule } from 'primeng/inputmask';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { Select } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';
import { Poule, Team } from '../../../models';
import { UserRole } from '../../../../home/tournament.interface';
import type { SaveGameEvent } from '../games';
import { CallPipe } from 'ngxtension/call-apply';

export interface DeleteGameAction {
  action: 'delete';
}

export type GameFormDialogResult = SaveGameEvent | DeleteGameAction;

interface GameFormDialogData {
  teams: Team[];
  role: UserRole | '';
  isEditing: boolean;
  currentPoule: Poule | null;
  initialTeam1Ref?: DocumentReference | null;
  initialTeam2Ref?: DocumentReference | null;
  initialScoreTeam1?: number | null;
  initialScoreTeam2?: number | null;
  initialDate?: Date | null;
  initialReferees?: string[] | null;
  initialComment?: string | null;
  gameRef?: DocumentReference | null;
  freeSlotDateKeys?: Set<string>;
}

@Component({
  selector: 'app-game-form-dialog',
  imports: [
    TranslocoPipe,
    FormsModule,
    FloatLabel,
    Select,
    InputNumberModule,
    DatePicker,
    InputMaskModule,
    AutoCompleteModule,
    Button,
    Message,
    CallPipe,
    TextareaModule,
  ],
  templateUrl: './game-form-dialog.html',
  styleUrl: './game-form-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameFormDialog {
  private readonly translocoService = inject(TranslocoService);
  private readonly config = inject(DynamicDialogConfig<GameFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly datepickerConfig = inject(DatepickerConfigService);

  data = this.config.data ?? {
    teams: [],
    role: '',
    isEditing: false,
    currentPoule: null,
  };

  firstDayOfWeek = this.datepickerConfig.firstDayOfWeek;
  datePlaceholder = this.datepickerConfig.datePlaceholder;
  datePickerFormat = this.datepickerConfig.datePickerFormat;

  gameDateString = '';

  get gameDateModel(): Date | string | null {
    return this.gameDate() ?? (this.gameDateString || null);
  }

  set gameDateModel(value: Date | string | null) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      this.gameDate.set(value);
      this.gameDateString = this.formatDateForMask(value);
      return;
    }

    if (typeof value === 'string') {
      this.gameDateString = value;
      if (!value) {
        this.gameDate.set(null);
      }
      return;
    }

    this.clearGameDate();
  }

  selectedTeam1Ref = signal<DocumentReference | null>(this.data.initialTeam1Ref ?? null);
  selectedTeam2Ref = signal<DocumentReference | null>(this.data.initialTeam2Ref ?? null);
  scoreTeam1 = signal<number | null>(this.data.initialScoreTeam1 ?? null);
  scoreTeam2 = signal<number | null>(this.data.initialScoreTeam2 ?? null);
  gameDate = signal<Date | null>(this.data.initialDate ?? null);
  gameReferees = signal<string[]>(this.data.initialReferees ? [...this.data.initialReferees] : []);
  gameComment = signal<string>(this.data.initialComment ?? '');

  dialogTeams = computed(() => {
    const poule = this.data.currentPoule;
    if (!poule) return [];
    const refTeams = poule.refTeams ?? [];
    return this.data.teams
      .filter((team: Team) => refTeams.some((ref: DocumentReference) => ref.id === team.ref?.id))
      .sort((a: Team, b: Team) => a.name.localeCompare(b.name));
  });

  isSameTeam = computed(() => {
    const ref1 = this.selectedTeam1Ref();
    const ref2 = this.selectedTeam2Ref();
    return !!ref1 && !!ref2 && ref1.id === ref2.id;
  });

  isSaveDisabled = computed(
    () => !this.selectedTeam1Ref() || !this.selectedTeam2Ref() || this.isSameTeam(),
  );

  hasFreeSlot = createHasFreeSlot(this.data.freeSlotDateKeys);

  constructor() {
    if (this.data.initialDate) {
      this.gameDateString = this.formatDateForMask(this.data.initialDate);
    }
  }

  onDatepickerShow(): void {
    if (!this.gameDate()) {
      const now = new Date();
      this.roundMinutesUp(now);
      this.gameDate.set(now);
      this.gameDateString = this.formatDateForMask(now);
    }
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onDelete(): void {
    const result: DeleteGameAction = { action: 'delete' };
    this.dialogRef.close(result);
  }

  onSave(): void {
    const team1Ref = this.selectedTeam1Ref();
    const team2Ref = this.selectedTeam2Ref();
    const pouleRef = this.data.currentPoule?.ref;

    if (!team1Ref || !team2Ref || !pouleRef) {
      return;
    }

    const event: SaveGameEvent = {
      pouleRef,
      refTeam1: team1Ref,
      refTeam2: team2Ref,
      scoreTeam1: this.scoreTeam1(),
      scoreTeam2: this.scoreTeam2(),
      date: this.gameDate(),
      referees: this.gameReferees().length > 0 ? this.gameReferees() : null,
      comment: this.gameComment().trim() || null,
    };

    // Include gameRef if editing
    if (this.data.isEditing && this.data.gameRef) {
      event.gameRef = this.data.gameRef;
    }

    this.dialogRef.close(event);
  }

  onDateMaskComplete(): void {
    const value = this.gameDateString;
    const parts = value.split(' ');
    if (parts.length < 2) return;
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length < 3 || timeParts.length < 2) return;

    let day: number;
    let month: number;

    if (this.datepickerConfig.activeLanguage() === 'en') {
      month = parseInt(dateParts[0], 10) - 1;
      day = parseInt(dateParts[1], 10);
    } else {
      day = parseInt(dateParts[0], 10);
      month = parseInt(dateParts[1], 10) - 1;
    }

    const year = parseInt(dateParts[2], 10);
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const date = new Date(year, month, day, hours, minutes);

    if (!isNaN(date.getTime())) {
      this.roundMinutesUp(date);
      this.gameDate.set(date);
      this.gameDateString = this.formatDateForMask(date);
    }
  }

  private roundMinutesUp(date: Date): void {
    const remainder = date.getMinutes() % 5;
    if (remainder !== 0) {
      date.setMinutes(date.getMinutes() + (5 - remainder));
    }
    date.setSeconds(0, 0);
  }

  clearGameDate(): void {
    this.gameDate.set(null);
    this.gameDateString = '';
  }

  private formatDateForMask(date: Date | null): string {
    if (!date) return '';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (this.datepickerConfig.activeLanguage() === 'en') {
      return `${month}/${day}/${year} ${hours}:${minutes}`;
    }

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

function createHasFreeSlot(
  keys?: Set<string>,
): (date: { day: number; month: number; year: number }) => boolean {
  return (date) => {
    if (!keys || keys.size === 0) return false;
    const key = `${date.year}-${String(date.month + 1).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
    return keys.has(key);
  };
}
