import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TimeSlot } from '../../../../../tournaments/models';
import { FirebaseService } from '../../../../../shared/services/firebase.service';
import { DatepickerConfigService } from '../../../../../shared/services/datepicker-config.service';

export interface AiTimeSlotsDialogData {
  tournamentId: string;
  token: string;
  currentTimeSlots: TimeSlot[];
}

export interface AiTimeSlotsDialogResult {
  toAdd: Date[];
  toDelete: DocumentReference[];
}

@Component({
  selector: 'app-ai-time-slots-dialog',
  imports: [FormsModule, FloatLabel, TextareaModule, Button, MessageModule, DatePipe, TranslocoPipe],
  templateUrl: './ai-time-slots-dialog.html',
})
export class AiTimeSlotsDialog {
  private readonly firebaseService = inject(FirebaseService);
  private readonly translocoService = inject(TranslocoService);
  private readonly config = inject(DynamicDialogConfig<AiTimeSlotsDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly datepickerConfig = inject(DatepickerConfigService);

  readonly data: AiTimeSlotsDialogData = this.config.data ?? {
    tournamentId: '',
    token: '',
    currentTimeSlots: [],
  };

  prompt = signal('');
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  proposedDates = signal<Date[] | null>(null);
  dateLocale = this.datepickerConfig.activeLanguage;

  slotsToAdd = computed(() => {
    const proposed = this.proposedDates();
    if (!proposed) return [];
    const currentIso = new Set(this.data.currentTimeSlots.map((s) => s.date.toISOString()));
    return proposed.filter((d) => !currentIso.has(d.toISOString()));
  });

  slotsToDelete = computed(() => {
    const proposed = this.proposedDates();
    if (!proposed) return [];
    const proposedIso = new Set(proposed.map((d) => d.toISOString()));
    return this.data.currentTimeSlots.filter((s) => !proposedIso.has(s.date.toISOString()));
  });

  hasChanges = computed(
    () => this.slotsToAdd().length > 0 || this.slotsToDelete().length > 0,
  );

  isPreviewReady = computed(() => this.proposedDates() !== null);

  async onGeneratePreview(): Promise<void> {
    const promptText = this.prompt().trim();
    if (!promptText) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.proposedDates.set(null);

    try {
      const currentIso = this.data.currentTimeSlots.map((s) => s.date.toISOString());
      const proposed = await this.firebaseService.getAiTimeSlotsProposal(
        this.data.tournamentId,
        this.data.token,
        promptText,
        currentIso,
      );
      const uniqueSortedIso = Array.from(new Set(proposed)).sort(
        (a, b) => Date.parse(a) - Date.parse(b),
      );
      this.proposedDates.set(uniqueSortedIso.map((iso) => new Date(iso)));
    } catch {
      this.errorMessage.set(this.translocoService.translate('admin.timeSlots.ai.errorGenerate'));
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onApply(): void {
    if (!this.isPreviewReady()) return;
    const result: AiTimeSlotsDialogResult = {
      toAdd: this.slotsToAdd(),
      toDelete: this.slotsToDelete().map((s) => s.ref),
    };
    this.dialogRef.close(result);
  }
}
