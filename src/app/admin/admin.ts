import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Tournament, User } from '../home/tournament.interface';
import { RouterLink } from '@angular/router';
import { injectParams } from 'ngxtension/inject-params';
import { TranslocoService } from '@jsverse/transloco';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AdminTypes } from './types/admin-types';
import { TournamentHeader } from '../shared/tournament-header/tournament-header';
import { FirebaseService } from '../shared/services/firebase.service';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    AdminTypes,
    TranslocoModule,
    TournamentHeader,
  ],
  providers: [MessageService],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  firebaseService = inject(FirebaseService);
  messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);

  tournamentId = injectParams('tournamentId');
  token = injectParams('token');

  user = signal<User | null>(null);
  loading = signal(true);
  accessDenied = signal(false);
  tournament = signal<Tournament | null>(null);

  constructor() {
    void this.loadUser();
  }

  private async loadUser(): Promise<void> {
    const tournamentId = this.tournamentId();
    const token = this.token();

    if (!this.firebaseService.isAvailable() || !tournamentId || !token) {
      this.accessDenied.set(true);
      this.loading.set(false);
      return;
    }

    try {
      const user = await this.firebaseService.getUserByTournamentAndToken(tournamentId, token);
      if (!user) {
        this.accessDenied.set(true);
        return;
      }

      this.user.set(user as User);
      this.accessDenied.set(false);
      this.loadTournament();
    } catch (error) {
      console.error('Failed to load admin user', error);
      this.accessDenied.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async loadTournament(): Promise<void> {
    const tournamentId = this.tournamentId();

    if (!this.firebaseService.isAvailable() || !tournamentId) {
      return;
    }

    try {
      const tournament = await this.firebaseService.getTournamentById(tournamentId);
      if (!tournament) {
        return;
      }

      console.log('Loaded tournament:', tournament);

      if (tournament.status == 'waitingValidation') {
        console.log('Tournament is waiting validation, updating status to paused');
        await this.firebaseService.updateTournamentStatus(tournament.ref, 'paused');
        this.tournament.set({ ...tournament, status: 'paused' });
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.validated'),
          detail: this.translocoService.translate('admin.validatedDetail'),
          life: 10000,
        });
        return;
      }

      this.tournament.set(tournament);
    } catch (error) {
      console.error('Failed to load tournament', error);
    }
  }
}
