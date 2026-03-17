import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  collection,
  collectionData,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  addDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { Tournament, TournamentStatus, User } from '../../home/tournament.interface';
import { Team } from '../../tournaments/types/shared/teams/teams';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore, { optional: true });
  private environmentInjector = inject(EnvironmentInjector);

  isAvailable(): boolean {
    return !!this.firestore;
  }

  watchTournaments(): Observable<Tournament[]> {
    if (!this.firestore) {
      return of([]);
    }

    return collectionData(collection(this.firestore, 'tournaments')) as Observable<Tournament[]>;
  }

  async getUserByTournamentAndToken(tournamentId: number, token: string): Promise<User | null> {
    if (!this.firestore) {
      return null;
    }

    const usersQuery = query(
      collection(this.firestore, 'users'),
      where('tournamentId', '==', tournamentId),
      where('token', '==', token),
      limit(1),
    );

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(usersQuery);
    });

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as User;
  }

  async getTournamentById(tournamentId: number): Promise<Tournament | null> {
    if (!this.firestore) {
      return null;
    }

    const tournamentsQuery = query(
      collection(this.firestore, 'tournaments'),
      where('id', '==', tournamentId),
      limit(1),
    );

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(tournamentsQuery);
    });

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as Tournament;
  }

  async getTournamentByIdWithRef(
    tournamentId: number,
  ): Promise<{ tournament: Tournament; ref: DocumentReference } | null> {
    if (!this.firestore) {
      return null;
    }

    const tournamentsQuery = query(
      collection(this.firestore, 'tournaments'),
      where('id', '==', tournamentId),
      limit(1),
    );

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(tournamentsQuery);
    });

    if (snapshot.empty) {
      return null;
    }

    const tournamentDoc = snapshot.docs[0];
    return {
      tournament: tournamentDoc.data() as Tournament,
      ref: tournamentDoc.ref,
    };
  }

  async getTournamentWithCollectionyId(
    tournamentId: number,
    collenctionName: string,
  ): Promise<{ tournament: Tournament; ref: DocumentReference } | null> {
    const tournamentWithRef = await this.getTournamentByIdWithRef(tournamentId);
    if (!tournamentWithRef) {
      return null;
    }

    const collectionSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(collection(tournamentWithRef.ref, collenctionName));
    });
    const collectionData = collectionSnapshot.docs.map((doc) => doc.data() as Team);

    return {
      ref: tournamentWithRef.ref,
      tournament: {
        ...tournamentWithRef.tournament,
        data: {
          ...(tournamentWithRef.tournament.data ?? {}),
          [collenctionName]: collectionData,
        },
      } as Tournament,
    };
  }

  async updateTournamentStatus(ref: DocumentReference, status: TournamentStatus): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(ref, { status });
    });
  }

  async getNextTournamentId(): Promise<number> {
    if (!this.firestore) {
      return 1;
    }

    const latestTournamentQuery = query(
      collection(this.firestore, 'tournaments'),
      orderBy('id', 'desc'),
      limit(1),
    );

    const latestTournamentSnapshot = await runInInjectionContext(
      this.environmentInjector,
      async () => {
        return getDocs(latestTournamentQuery);
      },
    );

    const latestTournament = latestTournamentSnapshot.docs[0]?.data() as {
      id?: number;
    };
    const latestTournamentId = typeof latestTournament?.id === 'number' ? latestTournament.id : 0;

    return latestTournamentId + 1;
  }

  async createTournament(tournament: Tournament): Promise<void> {
    if (!this.firestore) {
      return;
    }

    await runInInjectionContext(this.environmentInjector, async () => {
      await addDoc(collection(this.firestore!, 'tournaments'), tournament);
    });
  }

  async createUser(user: User): Promise<void> {
    if (!this.firestore) {
      return;
    }

    await runInInjectionContext(this.environmentInjector, async () => {
      await addDoc(collection(this.firestore!, 'users'), user);
    });
  }

  async addTeamToTournament(tournamentRef: DocumentReference, teamName: string): Promise<Team> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'));
    const team: Team = { id: teamDocRef.id, name: teamName };
    await runInInjectionContext(this.environmentInjector, async () => {
      await setDoc(teamDocRef, team);
    });
    return team;
  }

  async updateTeamInTournament(tournamentRef: DocumentReference, team: Team): Promise<void> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'), team.id);
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(teamDocRef, { name: team.name });
    });
  }

  async deleteTeamFromTournament(tournamentRef: DocumentReference, teamId: string): Promise<void> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'), teamId);
    await runInInjectionContext(this.environmentInjector, async () => {
      await deleteDoc(teamDocRef);
    });
  }

  async queueMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.firestore) {
      return;
    }

    await runInInjectionContext(this.environmentInjector, async () => {
      await addDoc(collection(this.firestore!, 'mail'), {
        to,
        message: {
          subject,
          html,
        },
      });
    });
  }
}
