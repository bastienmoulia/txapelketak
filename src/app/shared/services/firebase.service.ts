import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  arrayRemove,
  arrayUnion,
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

    return collectionData(collection(this.firestore, 'tournaments')) as Observable<Tournament[]>;
  }

  async getUserByTournamentAndToken(tournamentId: number, token: string): Promise<User | null> {
    if (!this.firestore) {
      return null;
    }

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      const usersQuery = query(
        collection(this.firestore!, 'users'),
        where('tournamentId', '==', tournamentId),
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

  async getTournamentById(tournamentId: number): Promise<Tournament | null> {
    if (!this.firestore) {
      return null;
    }

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      const tournamentsQuery = query(
        collection(this.firestore!, 'tournaments'),
        where('id', '==', tournamentId),
        limit(1),
      );
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

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      const tournamentsQuery = query(
        collection(this.firestore!, 'tournaments'),
        where('id', '==', tournamentId),
        limit(1),
      );
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
    const collectionData = collectionSnapshot.docs.map((doc) => doc.data() as unknown);

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

  async getTournamentCollection(
    tournamentId: number,
    collenctionName: string,
  ): Promise<
    | {
        data: unknown;
        ref: DocumentReference;
      }[]
    | null
  > {
    const tournamentWithRef = await this.getTournamentByIdWithRef(tournamentId);
    if (!tournamentWithRef) {
      return null;
    }

    return await this.getCollectionFromDocumentRef(tournamentWithRef.ref, collenctionName);
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

  async getNextTournamentId(): Promise<number> {
    if (!this.firestore) {
      return 1;
    }

    const latestTournamentSnapshot = await runInInjectionContext(
      this.environmentInjector,
      async () => {
        const latestTournamentQuery = query(
          collection(this.firestore!, 'tournaments'),
          orderBy('id', 'desc'),
          limit(1),
        );
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

  async addSeriesToTournament(tournamentRef: DocumentReference, name: string): Promise<DocumentReference> {
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

  async removeTeamRefFromPoule(pouleRef: DocumentReference, teamRef: DocumentReference): Promise<void> {
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

  async updateGame(gameRef: DocumentReference, gameData: Partial<Omit<Game, 'ref'>>): Promise<void> {
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
