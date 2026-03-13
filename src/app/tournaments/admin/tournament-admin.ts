import {
  Component,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { Firestore, collection, getDocs, limit, query, where } from '@angular/fire/firestore';
import { User } from '../../home/tournament.interface';
import { injectParams } from 'ngxtension/inject-params';

@Component({
  selector: 'app-tournament-admin',
  imports: [],
  templateUrl: './tournament-admin.html',
  styleUrl: './tournament-admin.css',
})
export class TournamentAdmin {
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);

  tournamentId = injectParams('tournamentId');
  token = injectParams('token');

  user = signal<User | null>(null);
  loading = signal(true);
  accessDenied = signal(false);

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
    } catch (error) {
      console.error('Failed to load admin user', error);
      this.accessDenied.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
