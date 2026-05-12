import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { Tournament } from '../../../../home/tournament.interface';
import {
  buildTournamentCalendarUrl,
  DEFAULT_GAME_DURATION_MINUTES,
} from '../../../../shared/calendar/tournament-calendar';
import { FirebaseService } from '../../../../shared/services/firebase.service';

@Component({
  selector: 'app-admin-general',
  imports: [
    ButtonModule,
    FloatLabel,
    FormsModule,
    InputNumberModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    TranslocoModule,
  ],
  templateUrl: './admin-general.html',
  styleUrl: './admin-general.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGeneral {
  private readonly document = inject(DOCUMENT);
  private readonly firebaseService = inject(FirebaseService);
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);

  tournament = input.required<Tournament>();

  name = signal('');
  description = signal('');
  gameDurationMinutes = signal<number | null>(DEFAULT_GAME_DURATION_MINUTES);
  isEditing = signal(false);
  isSaving = signal(false);

  private loadedTournamentId = signal<string | null>(null);
  calendarUrl = computed(() =>
    buildTournamentCalendarUrl(this.document.defaultView?.location.origin ?? '', this.tournament().ref.id),
  );

  constructor() {
    effect(() => {
      const t = this.tournament();
      if (this.loadedTournamentId() === t.ref.id) {
        return;
      }
      console.debug('[AdminGeneral] Initializing signals from tournament:', {
        name: t.name,
        id: t.ref.id,
      });
      this.loadedTournamentId.set(t.ref.id);
      this.name.set(t.name);
      this.description.set(t.description ?? '');
      this.gameDurationMinutes.set(t.gameDurationMinutes ?? DEFAULT_GAME_DURATION_MINUTES);
      this.isEditing.set(false);
    });
  }

  onEdit(): void {
    const tournament = this.tournament();
    console.debug('[AdminGeneral] onEdit:', {
      name: tournament.name,
      description: tournament.description,
    });
    this.name.set(tournament.name);
    this.description.set(tournament.description ?? '');
    this.gameDurationMinutes.set(tournament.gameDurationMinutes ?? DEFAULT_GAME_DURATION_MINUTES);
    this.isEditing.set(true);
  }

  onCancel(): void {
    this.isEditing.set(false);
  }

  async onSave(): Promise<void> {
    const tournament = this.tournament();
    if (!tournament.ref) {
      return;
    }

    const gameDurationMinutes = this.gameDurationMinutes();
    if (!gameDurationMinutes) {
      return;
    }

    this.isSaving.set(true);
    try {
      await this.firebaseService.updateTournamentInfo(tournament.ref, {
        name: this.name(),
        description: this.description(),
        gameDurationMinutes,
      });
      this.isEditing.set(false);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.general.saved'),
        detail: this.translocoService.translate('admin.general.savedDetail'),
      });
    } finally {
      this.isSaving.set(false);
    }
  }
}
