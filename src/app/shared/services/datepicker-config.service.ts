import { Injectable, computed, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class DatepickerConfigService {
  private translocoService = inject(TranslocoService);

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  firstDayOfWeek = computed(() => {
    this.activeLanguage();
    return Number(this.translocoService.translate('datepicker.firstDayOfWeek'));
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
  });

  datePickerFormat = computed(() => {
    const lang = this.activeLanguage();

    switch (lang) {
      case 'en':
        return 'mm/dd/yy';
      case 'fr':
      case 'es':
      case 'eu':
      default:
        return 'dd/mm/yy';
    }
  });
}
