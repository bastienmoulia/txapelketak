import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';
import { TimeSlot } from '../../../../tournaments/types/poules/poules';
import { Tournament } from '../../../../home/tournament.interface';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';

@Component({
  selector: 'app-admin-time-slots',
  imports: [ButtonModule, DatePicker, DatePipe, FormsModule, TranslocoModule],
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

  async onAddTimeSlot(): Promise<void> {
    const date = this.newSlotDate();
    if (!date) return;

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

  async onDeleteTimeSlot(timeSlotRef: DocumentReference): Promise<void> {
    await this.firebaseService.deleteTimeSlot(timeSlotRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.timeSlots.deleted'),
      detail: this.translocoService.translate('admin.timeSlots.deletedDetail'),
    });
  }
}
