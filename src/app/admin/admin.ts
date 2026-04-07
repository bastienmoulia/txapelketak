import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { User } from '../home/tournament.interface';
import { RouterLink } from '@angular/router';
import { injectParams } from 'ngxtension/inject-params';
import { TranslocoService } from '@jsverse/transloco';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { DocumentReference } from '@angular/fire/firestore';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AdminTypes } from './types/admin-types';
import { TournamentHeader } from '../shared/tournament-header/tournament-header';
import { FirebaseService } from '../shared/services/firebase.service';
import { TournamentDetailStore } from '../store/tournament-detail.store';
import { StoreDebugPanel } from '../shared/store-debug-panel/store-debug-panel';

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
    StoreDebugPanel,
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
  private destroyRef = inject(DestroyRef);
  private tournamentDetailStore = inject(TournamentDetailStore);

  tournamentId = injectParams('tournamentId');
  token = injectParams('token');

  readonly isDev = isDevMode();
  user = signal<User | null>(null);
  private loadingUser = signal(true);
  loading = computed(
    () => this.loadingUser() || (!!this.user() && this.tournamentDetailStore.loading()),
  );
  accessDenied = signal(false);
  tournament = this.tournamentDetailStore.tournament;
  private waitingValidationHandledForTournamentId = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.tournamentDetailStore.stopWatching();
    });

    effect(() => {
      const user = this.user();
      const accessDenied = this.accessDenied();
      if (!user || accessDenied) {
        return;
      }

      const tournament = this.tournament();
      if (!tournament) {
        return;
      }

      if (tournament.status !== 'waitingValidation') {
        return;
      }

      if (this.waitingValidationHandledForTournamentId() === tournament.ref.id) {
        return;
      }

      this.waitingValidationHandledForTournamentId.set(tournament.ref.id);
      void this.validateWaitingTournamentStatus(tournament.ref, tournament.ref.id);
    });

    void this.loadUser();
  }

  private async loadUser(): Promise<void> {
    const tournamentId = this.tournamentId();
    const token = this.token();

    if (!this.firebaseService.isAvailable() || !tournamentId || !token) {
      this.accessDenied.set(true);
      this.loadingUser.set(false);
      return;
    }

    try {
      const user = await this.firebaseService.getUserByTournamentAndToken(tournamentId, token);
      if (!user) {
        this.accessDenied.set(true);
        this.loadingUser.set(false);
        return;
      }

      this.user.set(user);
      this.accessDenied.set(false);
      this.tournamentDetailStore.startWatching(tournamentId);
      this.loadingUser.set(false);
    } catch (error) {
      console.error('Failed to load admin user', error);
      this.accessDenied.set(true);
      this.loadingUser.set(false);
    }
  }

  private async validateWaitingTournamentStatus(
    tournamentRef: DocumentReference,
    tournamentId: string,
  ): Promise<void> {
    try {
      console.debug('Tournament is waiting validation, updating status to paused');
      await this.firebaseService.updateTournamentStatus(tournamentRef, 'paused');
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.validated'),
        detail: this.translocoService.translate('admin.validatedDetail'),
        life: 10000,
      });
    } catch (error) {
      console.error('Failed to validate tournament status', error);
      this.waitingValidationHandledForTournamentId.set(null);
    }

    // If another tournament becomes active, allow status handling for it.
    if (this.tournamentId() !== tournamentId) {
      this.waitingValidationHandledForTournamentId.set(null);
    }
  }
}
