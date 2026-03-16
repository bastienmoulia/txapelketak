import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';
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
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);

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
    if (this.firestore) {
      const tournamentsCollection = collection(this.firestore, 'tournaments');
      collectionData(tournamentsCollection).subscribe((data) => {
        const all = data as Tournament[];
        const found = all.find((t) => String(t.id) === this.tournamentId());
        if (found) {
          this.tournament.set(found);
        } else {
          this.notFound.set(true);
        }
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
      this.notFound.set(true);
    }
  }
}
