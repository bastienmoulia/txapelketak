import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { injectParams } from 'ngxtension/inject-params';
import { MessageService } from 'primeng/api';
import { TournamentHeader } from '../../shared/tournament-header/tournament-header';
import { TournamentDetailStore } from '../../store/tournament-detail.store';
import { TournamentActionsService } from '../../shared/services/tournament-actions.service';
import { Poules } from '../types/poules/poules';
import { TournamentTabs } from '../../shared/tournament-tabs/tournament-tabs';

@Component({
  selector: 'app-tournament-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    MessageModule,
    TagModule,
    TranslocoModule,
    TournamentHeader,
    TournamentTabs,
    Poules,
  ],
  providers: [MessageService, TournamentActionsService],
  templateUrl: './tournament-detail.html',
  styleUrl: './tournament-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDetail {
  private tournamentDetailStore = inject(TournamentDetailStore);
  private destroyRef = inject(DestroyRef);

  tournamentId = injectParams('tournamentId');
  tournament = this.tournamentDetailStore.tournament;
  loading = this.tournamentDetailStore.loading;
  notFound = this.tournamentDetailStore.notFound;

  resendEmailControl = new FormControl('', [Validators.required, Validators.email]);
  resendEmailSent = signal(false);
  resendEmailError = signal('');

  newManagerUsername = new FormControl('', [Validators.required]);
  newManagerEmail = new FormControl('', [Validators.required, Validators.email]);
  managerAddError = signal('');
  managerAddSuccess = signal(false);

  constructor() {
    const tournamentId = this.tournamentId();

    if (!tournamentId) {
      return;
    }

    this.tournamentDetailStore.startWatching(tournamentId);

    this.destroyRef.onDestroy(() => {
      this.tournamentDetailStore.stopWatching();
    });
  }
}
