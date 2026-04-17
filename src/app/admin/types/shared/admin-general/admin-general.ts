import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { Tournament } from '../../../../home/tournament.interface';
import { FirebaseService } from '../../../../shared/services/firebase.service';

@Component({
  selector: 'app-admin-general',
  imports: [
    ButtonModule,
    FloatLabel,
    FormsModule,
    InputTextModule,
    TextareaModule,
    ToastModule,
    TranslocoModule,
  ],
  templateUrl: './admin-general.html',
  styleUrl: './admin-general.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminGeneral {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);

  tournament = input.required<Tournament>();

  name = signal('');
  description = signal('');
  isEditing = signal(false);
  isSaving = signal(false);

  private loadedTournamentId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const t = this.tournament();
      if (this.loadedTournamentId() === t.ref.id) {
        return;
      }
      this.loadedTournamentId.set(t.ref.id);
      this.name.set(t.name);
      this.description.set(t.description ?? '');
    });
  }

  onEdit(): void {
    this.name.set(this.tournament().name);
    this.description.set(this.tournament().description ?? '');
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

    this.isSaving.set(true);
    try {
      await this.firebaseService.updateTournamentInfo(tournament.ref, {
        name: this.name(),
        description: this.description(),
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
