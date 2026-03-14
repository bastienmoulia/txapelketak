import {
  ChangeDetectionStrategy,
  Component,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Tournament, User } from '../home/tournament.interface';
import { RouterLink } from '@angular/router';
import { injectParams } from 'ngxtension/inject-params';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AdminTypes } from './types/admin-types';

@Component({
  selector: 'app-admin',
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    MessageModule,
    ProgressSpinnerModule,
    TagModule,
    ToastModule,
    AdminTypes,
  ],
  providers: [MessageService],
  templateUrl: './admin.html',
  styleUrl: './admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Admin {
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);
  messageService = inject(MessageService);

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
    const firestore = this.firestore;
    const tournamentId = Number(this.tournamentId());
    const token = this.token();

    if (!firestore || !Number.isFinite(tournamentId) || !token) {
      this.accessDenied.set(true);
      this.loading.set(false);
      return;
    }

    try {
      const usersQuery = query(
        collection(firestore, 'users'),
        where('tournamentId', '==', tournamentId),
        where('token', '==', token),
        limit(1),
      );

      const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
        return getDocs(usersQuery);
      });

      if (snapshot.empty) {
        this.accessDenied.set(true);
        return;
      }

      this.user.set(snapshot.docs[0].data() as User);
      this.accessDenied.set(false);
      this.loadTournament();
    } catch (error) {
      console.error('Failed to load admin user', error);
      this.accessDenied.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  loadTournament(): void {
    const firestore = this.firestore;
    const tournamentId = Number(this.tournamentId());

    if (!firestore || !Number.isFinite(tournamentId)) {
      return;
    }

    const tournamentDocRef = collection(firestore, 'tournaments');
    getDocs(query(tournamentDocRef, where('id', '==', tournamentId), limit(1)))
      .then(async (snapshot) => {
        if (!snapshot.empty) {
          const tournamentDoc = snapshot.docs[0];
          const tournamentData = tournamentDoc.data() as Tournament;

          console.log('Loaded tournament:', tournamentData);
          if (tournamentData.status == 'waitingValidation') {
            console.log('Tournament is waiting validation, updating status to paused');
            await updateDoc(tournamentDoc.ref, { status: 'paused' });
            this.tournament.set({ ...tournamentData, status: 'paused' });
            this.messageService.add({
              severity: 'success',
              summary: 'Tournoi validé',
              detail:
                "Le tournoi a été validé et mis en pause. Passez-le à 'En cours' lorsque vous êtes prêt.",
              life: 10000,
            });
            return;
          } else {
            this.tournament.set(tournamentData);
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load tournament', error);
      });
  }
}
