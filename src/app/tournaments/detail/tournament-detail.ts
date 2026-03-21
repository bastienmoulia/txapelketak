import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { Tournament } from '../../home/tournament.interface';
import { Types } from '../types/types';
import { injectParams } from 'ngxtension/inject-params';
import { TournamentHeader } from '../../shared/tournament-header/tournament-header';
import { FirebaseService } from '../../shared/services/firebase.service';

@Component({
  selector: 'app-tournament-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    MessageModule,
    TagModule,
    Types,
    TranslocoModule,
    TournamentHeader,
  ],
  templateUrl: './tournament-detail.html',
  styleUrl: './tournament-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDetail {
  firebaseService = inject(FirebaseService);

  tournamentId = injectParams('tournamentId');
  tournament = signal<Tournament | null>(null);
  loading = signal(true);
  notFound = signal(false);

  resendEmailControl = new FormControl('', [Validators.required, Validators.email]);
  resendEmailSent = signal(false);
  resendEmailError = signal('');

  newManagerUsername = new FormControl('', [Validators.required]);
  newManagerEmail = new FormControl('', [Validators.required, Validators.email]);
  managerAddError = signal('');
  managerAddSuccess = signal(false);

  constructor() {
    if (!this.firebaseService.isAvailable()) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.firebaseService.watchTournaments().subscribe((all) => {
      const found = all.find((t) => t.id === this.tournamentId());
      if (found) {
        this.tournament.set(found);
        this.notFound.set(false);
      } else {
        this.notFound.set(true);
      }
      this.loading.set(false);
    });
  }
}
