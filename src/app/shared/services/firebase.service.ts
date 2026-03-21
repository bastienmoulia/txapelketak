import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionSnapshots,
  deleteDoc,
  doc,
  DocumentReference,
  Firestore,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  addDoc,
  where,
} from '@angular/fire/firestore';
import { map, Observable, of } from 'rxjs';
import { Tournament, TournamentStatus, User } from '../../home/tournament.interface';
import { Team } from '../../tournaments/types/shared/teams/teams';
import { Game } from '../../tournaments/types/poules/poules';

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

    return collectionSnapshots(collection(this.firestore, 'tournaments')).pipe(
      map((snapshots) =>
        snapshots.map((snap) => ({ ref: snap.ref, ...snap.data() }) as Tournament),
      ),
    );
  }

  async getUserByTournamentAndToken(tournamentId: string, token: string): Promise<User | null> {
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      const usersQuery = query(
        collection(this.firestore!, 'users'),
        where('refTournament', '==', tournamentRef),
        where('token', '==', token),
        limit(1),
      );
      return getDocs(usersQuery);
    });

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as User;
  }

  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDoc(tournamentRef);
    });

    if (!snapshot.exists()) {
      return null;
    }

    return { ref: snapshot.ref, ...snapshot.data() } as Tournament;
  }

  async getTournamentByIdWithRef(
    tournamentId: string,
  ): Promise<{ tournament: Tournament; ref: DocumentReference } | null> {
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDoc(tournamentRef);
    });

    if (!snapshot.exists()) {
      return null;
    }

    const tournament = { ref: snapshot.ref, ...snapshot.data() } as Tournament;
    return {
      tournament,
      ref: snapshot.ref,
    };
  }

  async getTournamentWithCollectionyId(
    tournamentRef: DocumentReference,
    collectionName: string,
  ): Promise<{ tournament: Tournament; ref: DocumentReference } | null> {
    const tournamentSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDoc(tournamentRef);
    });

    if (!tournamentSnapshot.exists()) {
      return null;
    }

    const tournament = { ref: tournamentRef, ...tournamentSnapshot.data() } as Tournament;

    const collectionSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(collection(tournamentRef, collectionName));
    });
    const collectionData = collectionSnapshot.docs.map((doc) => doc.data() as unknown);

    return {
      ref: tournamentRef,
      tournament: {
        ...tournament,
        data: {
          ...(tournament.data ?? {}),
          [collectionName]: collectionData,
        },
      } as Tournament,
    };
  }

  async getTournamentCollection(
    tournamentRef: DocumentReference,
    collectionName: string,
  ): Promise<
    {
      data: unknown;
      ref: DocumentReference;
    }[]
  > {
    return await this.getCollectionFromDocumentRef(tournamentRef, collectionName);
  }

  async getCollectionFromDocumentRef(
    ref: DocumentReference,
    collectionName: string,
  ): Promise<
    {
      data: unknown;
      ref: DocumentReference;
    }[]
  > {
    const collectionSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(collection(ref, collectionName));
    });
    const collectionData = collectionSnapshot.docs.map((doc) => ({
      data: doc.data() as unknown,
      ref: doc.ref,
    }));

    return collectionData;
  }

  async updateTournamentStatus(ref: DocumentReference, status: TournamentStatus): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(ref, { status });
    });
  }

  async createTournament(tournament: Omit<Tournament, 'ref'>): Promise<DocumentReference | null> {
    if (!this.firestore) {
      return null;
    }

    const docRef = await runInInjectionContext(this.environmentInjector, async () => {
      return addDoc(collection(this.firestore!, 'tournaments'), tournament);
    });
    return docRef;
  }

  async createUser(user: User): Promise<void> {
    if (!this.firestore) {
      return;
    }

    await runInInjectionContext(this.environmentInjector, async () => {
      await addDoc(collection(this.firestore!, 'users'), user);
    });
  }

  async getUsersByTournament(tournamentRef: DocumentReference): Promise<User[]> {
    if (!this.firestore) {
      return [];
    }

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      return getDocs(
        query(collection(this.firestore!, 'users'), where('refTournament', '==', tournamentRef)),
      );
    });
    return snapshot.docs.map((d) => ({ ...(d.data() as User), ref: d.ref }));
  }

  async updateUser(ref: DocumentReference, userData: Partial<Omit<User, 'ref'>>): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(ref, userData as Record<string, unknown>);
    });
  }

  async deleteUserDoc(ref: DocumentReference): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await deleteDoc(ref);
    });
  }

  async addTeamToTournament(tournamentRef: DocumentReference, teamName: string): Promise<Team> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'));
    const team: Team = { ref: teamDocRef, name: teamName };
    await runInInjectionContext(this.environmentInjector, async () => {
      await setDoc(teamDocRef, team);
    });
    return team;
  }

  async updateTeamInTournament(tournamentRef: DocumentReference, team: Team): Promise<void> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'), team.ref.id);
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(teamDocRef, { name: team.name });
    });
  }

  async deleteTeamFromTournament(tournamentRef: DocumentReference, teamRef: string): Promise<void> {
    const teamDocRef = doc(collection(tournamentRef, 'teams'), teamRef);
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

  async addSeriesToTournament(
    tournamentRef: DocumentReference,
    name: string,
  ): Promise<DocumentReference> {
    const serieDocRef = doc(collection(tournamentRef, 'series'));
    await runInInjectionContext(this.environmentInjector, async () => {
      await setDoc(serieDocRef, { name });
    });
    return serieDocRef;
  }

  async updateSerieInTournament(serieRef: DocumentReference, name: string): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(serieRef, { name });
    });
  }

  async deleteSerieFromTournament(serieRef: DocumentReference): Promise<void> {
    const pouleDocs = await this.getCollectionFromDocumentRef(serieRef, 'poules');
    for (const pouleDoc of pouleDocs) {
      await runInInjectionContext(this.environmentInjector, async () => {
        await deleteDoc(pouleDoc.ref);
      });
    }
    await runInInjectionContext(this.environmentInjector, async () => {
      await deleteDoc(serieRef);
    });
  }

  async addPouleToSerie(serieRef: DocumentReference, name: string): Promise<DocumentReference> {
    const pouleDocRef = doc(collection(serieRef, 'poules'));
    await runInInjectionContext(this.environmentInjector, async () => {
      await setDoc(pouleDocRef, { name, refTeams: [] });
    });
    return pouleDocRef;
  }

  async updatePouleInSerie(pouleRef: DocumentReference, name: string): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(pouleRef, { name });
    });
  }

  async deletePouleFromSerie(pouleRef: DocumentReference): Promise<void> {
    await this.deletePouleGames(pouleRef);
    await runInInjectionContext(this.environmentInjector, async () => {
      await deleteDoc(pouleRef);
    });
  }

  async addTeamRefToPoule(pouleRef: DocumentReference, teamRef: DocumentReference): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(pouleRef, { refTeams: arrayUnion(teamRef) });
    });
  }

  async removeTeamRefFromPoule(
    pouleRef: DocumentReference,
    teamRef: DocumentReference,
  ): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(pouleRef, { refTeams: arrayRemove(teamRef) });
    });
  }

  async deletePouleGames(pouleRef: DocumentReference): Promise<void> {
    const gameDocs = await this.getCollectionFromDocumentRef(pouleRef, 'games');
    for (const gameDoc of gameDocs) {
      await runInInjectionContext(this.environmentInjector, async () => {
        await deleteDoc(gameDoc.ref);
      });
    }
  }

  async addGameToPoule(
    pouleRef: DocumentReference,
    gameData: Omit<Game, 'ref'>,
  ): Promise<DocumentReference> {
    const gameDocRef = doc(collection(pouleRef, 'games'));
    const data: Record<string, unknown> = {
      refTeam1: gameData.refTeam1,
      refTeam2: gameData.refTeam2,
    };
    if (gameData.scoreTeam1 != null) data['scoreTeam1'] = gameData.scoreTeam1;
    if (gameData.scoreTeam2 != null) data['scoreTeam2'] = gameData.scoreTeam2;
    if (gameData.date != null) data['date'] = gameData.date;
    await runInInjectionContext(this.environmentInjector, async () => {
      await setDoc(gameDocRef, data);
    });
    return gameDocRef;
  }

  async updateGame(
    gameRef: DocumentReference,
    gameData: Partial<Omit<Game, 'ref'>>,
  ): Promise<void> {
    const data: Record<string, unknown> = {};
    if (gameData.refTeam1 !== undefined) data['refTeam1'] = gameData.refTeam1;
    if (gameData.refTeam2 !== undefined) data['refTeam2'] = gameData.refTeam2;
    data['scoreTeam1'] = gameData.scoreTeam1 ?? null;
    data['scoreTeam2'] = gameData.scoreTeam2 ?? null;
    data['date'] = gameData.date ?? null;
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(gameRef, data);
    });
  }

  async deleteGameFromPoule(gameRef: DocumentReference): Promise<void> {
    await runInInjectionContext(this.environmentInjector, async () => {
      await deleteDoc(gameRef);
    });
  }
}
