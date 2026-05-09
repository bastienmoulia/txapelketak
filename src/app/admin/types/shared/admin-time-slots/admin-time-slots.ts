import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';
import { TimeSlot } from '../../../../tournaments/types/poules/poules';
import { Tournament } from '../../../../home/tournament.interface';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';

@Component({
  selector: 'app-admin-time-slots',
  imports: [ButtonModule, DatePicker, DatePipe, FormsModule, TooltipModule, TranslocoModule],
  templateUrl: './admin-time-slots.html',
  styleUrl: './admin-time-slots.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTimeSlots {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private datepickerConfig = inject(DatepickerConfigService);

  tournament = input.required<Tournament>();
  timeSlots = input<TimeSlot[]>([]);

  newSlotDate = signal<Date | null>(null);
  isSaving = signal(false);

  sortedTimeSlots = computed(() =>
    [...this.timeSlots()].sort((a, b) => a.date.getTime() - b.date.getTime()),
  );

  firstDayOfWeek = this.datepickerConfig.firstDayOfWeek;
  datePickerFormat = this.datepickerConfig.datePickerFormat;
  datePlaceholder = this.datepickerConfig.datePlaceholder;
  dateLocale = this.datepickerConfig.activeLanguage;

  onDatepickerShow(): void {
    if (!this.newSlotDate()) {
      const now = new Date();
      this.roundMinutesUp(now);
      this.newSlotDate.set(now);
    }
  }

  async onAddTimeSlot(): Promise<void> {
    const date = this.newSlotDate();
    if (!date) return;

    this.roundMinutesUp(date);

    const ref = this.tournament().ref;
    if (!ref) return;

    this.isSaving.set(true);
    try {
      await this.firebaseService.addTimeSlot(ref, date);
      this.newSlotDate.set(null);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.timeSlots.added'),
        detail: this.translocoService.translate('admin.timeSlots.addedDetail'),
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  private roundMinutesUp(date: Date): void {
    const remainder = date.getMinutes() % 5;
    if (remainder !== 0) {
      date.setMinutes(date.getMinutes() + (5 - remainder));
    }
    date.setSeconds(0, 0);
  }

  async onDeleteTimeSlot(timeSlotRef: DocumentReference): Promise<void> {
    await this.firebaseService.deleteTimeSlot(timeSlotRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.timeSlots.deleted'),
      detail: this.translocoService.translate('admin.timeSlots.deletedDetail'),
    });
  }
}
