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
import { RouterLink, RouterOutlet } from '@angular/router';
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
import { TournamentHeader } from '../shared/tournament-header/tournament-header';
import { FirebaseService } from '../shared/services/firebase.service';
import { TournamentDetailStore } from '../store/tournament-detail.store';
import { AuthStore } from '../store/auth.store';
import { PoulesStore } from '../store/poules.store';
import { TournamentTabs } from '../shared/tournament-tabs/tournament-tabs';
import { TournamentActionsService } from '../shared/services/tournament-actions.service';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    TranslocoModule,
    TournamentHeader,
    TournamentTabs,
    RouterOutlet,
  ],
  providers: [MessageService, TournamentActionsService],
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
  private authStore = inject(AuthStore);
  private poulesStore = inject(PoulesStore);

  tournamentId = injectParams('tournamentId');
  token = injectParams('token');

  readonly isDev = isDevMode();
  user = signal<User | null>(null);
  private loadingUser = signal(true);
  loading = computed(
    () => this.loadingUser() || (!!this.user() && this.tournamentDetailStore.loading()),
  );
  accessDenied = signal(true);
  tournament = this.tournamentDetailStore.tournament;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.tournamentDetailStore.stopWatching();
      this.poulesStore.stopWatching();
      this.authStore.clear();
    });

    effect(() => {
      const tournament = this.tournament();

      if (!tournament) {
        this.poulesStore.stopWatching();
        return;
      }

      this.poulesStore.startWatching(tournament.ref);
    });

    effect(() => {
      if (!this.tournament()) {
        return;
      }

      if (this.tournament()!.status === 'waitingValidation') {
        this.validateWaitingTournamentStatus(this.tournament()!.ref);
      }
    });

    effect(() => {
      void this.loadUser(this.tournamentId(), this.token());
    });
  }

  private async loadUser(
    tournamentId: string | null | undefined,
    token: string | null | undefined,
  ): Promise<void> {
    if (!this.firebaseService.isAvailable() || !tournamentId || !token) {
      this.user.set(null);
      this.authStore.clear();
      this.tournamentDetailStore.stopWatching();
      this.poulesStore.stopWatching();
      this.accessDenied.set(true);
      this.loadingUser.set(false);
      return;
    }

    try {
      const user = await this.firebaseService.getUserByTournamentAndToken(tournamentId, token);
      if (!user) {
        this.user.set(null);
        this.authStore.clear();
        this.tournamentDetailStore.stopWatching();
        this.poulesStore.stopWatching();
        this.accessDenied.set(true);
        this.loadingUser.set(false);
        return;
      }

      this.user.set(user);
      this.authStore.setUser(user);
      this.accessDenied.set(false);
      this.tournamentDetailStore.startWatching(tournamentId);
      this.loadingUser.set(false);
    } catch (error) {
      console.error('Failed to load admin user', error);
      this.user.set(null);
      this.authStore.clear();
      this.tournamentDetailStore.stopWatching();
      this.poulesStore.stopWatching();
      this.accessDenied.set(true);
      this.loadingUser.set(false);
    }
  }

  private async validateWaitingTournamentStatus(tournamentRef: DocumentReference): Promise<void> {
    try {
      await this.firebaseService.updateTournamentStatus(tournamentRef, 'ongoing');
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.validated'),
        detail: this.translocoService.translate('admin.validatedDetail'),
        life: 10000,
      });
    } catch (error) {
      console.error('Failed to validate tournament status', error);
    }
  }
}
