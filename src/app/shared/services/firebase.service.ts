import { EnvironmentInjector, inject, Injectable, runInInjectionContext } from '@angular/core';
import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionSnapshots,
  deleteDoc,
  doc,
  docSnapshots,
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
import { map, Observable, of, throwError } from 'rxjs';
import { Tournament, TournamentStatus, User } from '../../home/tournament.interface';
import { Team } from '../../tournaments/types/shared/teams/teams';
import { Game, TimeSlot, FinaleGame } from '../../tournaments/types/poules/poules';
import { TournamentYamlData } from '../../admin/types/shared/admin-import-export/admin-import-export';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private firestore = inject(Firestore, { optional: true });
  private environmentInjector = inject(EnvironmentInjector);

  isAvailable(): boolean {
    return !!this.firestore;
  }

  watchTournaments(showHidden = false): Observable<Tournament[]> {
    console.debug('[Firestore] watchTournaments: starting listener on tournaments collection');
    if (!this.firestore) {
      console.debug('[Firestore] watchTournaments: firestore unavailable');
      return throwError(() => new Error('Firestore unavailable'));
    }

    const tournamentsRef = collection(this.firestore, 'tournaments');
    const q = query(tournamentsRef, where('status', '!=', 'waitingValidation'));

    return collectionSnapshots(q).pipe(
      map((snapshots) =>
        snapshots
          .map((snap) => ({ ref: snap.ref, ...snap.data() }) as Tournament)
          .filter((tournament) => showHidden || !tournament.name.startsWith('_')),
      ),
    );
  }

  watchTournamentById(tournamentId: string): Observable<Tournament | null> {
    console.debug(`[Firestore] watchTournamentById: tournamentId=${tournamentId}`);
    if (!this.firestore) {
      console.debug('[Firestore] watchTournamentById: firestore unavailable');
      return of(null);
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    return docSnapshots(tournamentRef).pipe(
      map((snap) => (snap.exists() ? ({ ref: snap.ref, ...snap.data() } as Tournament) : null)),
    );
  }

  async getUserByTournamentAndToken(tournamentId: string, token: string): Promise<User | null> {
    console.debug(`[Firestore] getUserByTournamentAndToken: tournamentId=${tournamentId}`);
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDocs: querying users by refTournament and token`);
      const usersQuery = query(
        collection(this.firestore!, 'users'),
        where('refTournament', '==', tournamentRef),
        where('token', '==', token),
        limit(1),
      );
      return getDocs(usersQuery);
    });

    if (snapshot.empty) {
      console.debug(`[Firestore] getUserByTournamentAndToken: no user found`);
      return null;
    }

    console.debug(`[Firestore] getUserByTournamentAndToken: user found`);
    return { ...(snapshot.docs[0].data() as User), ref: snapshot.docs[0].ref };
  }

  async getTournamentById(tournamentId: string): Promise<Tournament | null> {
    console.debug(`[Firestore] getTournamentById: tournamentId=${tournamentId}`);
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDoc: tournaments/${tournamentId}`);
      return getDoc(tournamentRef);
    });

    if (!snapshot.exists()) {
      console.debug(`[Firestore] getTournamentById: tournament not found`);
      return null;
    }

    console.debug(`[Firestore] getTournamentById: tournament found`, snapshot.data());
    return { ref: snapshot.ref, ...snapshot.data() } as Tournament;
  }

  async getTournamentByIdWithRef(
    tournamentId: string,
  ): Promise<{ tournament: Tournament; ref: DocumentReference } | null> {
    console.debug(`[Firestore] getTournamentByIdWithRef: tournamentId=${tournamentId}`);
    if (!this.firestore) {
      return null;
    }

    const tournamentRef = doc(this.firestore, 'tournaments', tournamentId);
    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDoc: tournaments/${tournamentId}`);
      return getDoc(tournamentRef);
    });

    if (!snapshot.exists()) {
      console.debug(`[Firestore] getTournamentByIdWithRef: tournament not found`);
      return null;
    }

    console.debug(`[Firestore] getTournamentByIdWithRef: tournament found`, snapshot.data());
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
    console.debug(`[Firestore] getTournamentWithCollectionyId: collectionName=${collectionName}`);
    const tournamentSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDoc: tournament document`);
      return getDoc(tournamentRef);
    });

    if (!tournamentSnapshot.exists()) {
      console.debug(`[Firestore] getTournamentWithCollectionyId: tournament not found`);
      return null;
    }

    const tournament = { ref: tournamentRef, ...tournamentSnapshot.data() } as Tournament;

    const collectionSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDocs: collection ${collectionName}`);
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
    console.debug(`[Firestore] getCollectionFromDocumentRef: collectionName=${collectionName}`);
    const collectionSnapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDocs: collection ${collectionName}`);
      return getDocs(collection(ref, collectionName));
    });
    const collectionData = collectionSnapshot.docs.map((doc) => ({
      data: doc.data() as unknown,
      ref: doc.ref,
    }));

    return collectionData;
  }

  watchCollectionFromDocumentRef(
    ref: DocumentReference,
    collectionName: string,
  ): Observable<{ data: unknown; ref: DocumentReference }[]> {
    console.debug(`[Firestore] watchCollectionFromDocumentRef: ${ref.path}/${collectionName}`);
    if (!this.firestore) {
      return of([]);
    }
    return collectionSnapshots(collection(ref, collectionName)).pipe(
      map((snapshots) =>
        snapshots.map((snap) => ({
          data: snap.data(),
          ref: snap.ref,
        })),
      ),
    );
  }

  async updateTournamentInfo(
    ref: DocumentReference,
    info: { name: string; description: string },
  ): Promise<void> {
    console.debug(`[Firestore] updateTournamentInfo: name=${info.name}`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: tournament info`);
      await updateDoc(ref, { name: info.name, description: info.description });
    });
  }

  async updateTournamentStatus(ref: DocumentReference, status: TournamentStatus): Promise<void> {
    console.debug(`[Firestore] updateTournamentStatus: status=${status}`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: tournament status`);
      await updateDoc(ref, { status });
    });
  }

  async createTournament(tournament: Omit<Tournament, 'ref'>): Promise<DocumentReference | null> {
    console.debug(`[Firestore] createTournament: ${tournament.name}`);
    if (!this.firestore) {
      return null;
    }

    const docRef = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] addDoc: tournaments`);
      return addDoc(collection(this.firestore!, 'tournaments'), tournament);
    });
    return docRef;
  }

  async createUser(user: User): Promise<DocumentReference | null> {
    console.debug(`[Firestore] createUser: ${user.username}`);
    if (!this.firestore) {
      return null;
    }

    return runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] addDoc: users`);
      return addDoc(collection(this.firestore!, 'users'), user);
    });
  }

  async getUsersByTournament(tournamentRef: DocumentReference): Promise<User[]> {
    console.debug(`[Firestore] getUsersByTournament: fetching users`);
    if (!this.firestore) {
      return [];
    }

    const snapshot = await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] getDocs: querying users by refTournament`);
      return getDocs(
        query(collection(this.firestore!, 'users'), where('refTournament', '==', tournamentRef)),
      );
    });
    return snapshot.docs.map((d) => ({ ...(d.data() as User), ref: d.ref }));
  }

  async updateUser(ref: DocumentReference, userData: Partial<Omit<User, 'ref'>>): Promise<void> {
    console.debug(`[Firestore] updateUser: updating user document`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: user`);
      await updateDoc(ref, userData as Record<string, unknown>);
    });
  }

  async deleteUserDoc(ref: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteUserDoc: deleting user document`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: user`);
      await deleteDoc(ref);
    });
  }

  async addTeamToTournament(
    tournamentRef: DocumentReference,
    teamName: string,
    comment?: string,
  ): Promise<Team> {
    console.debug(`[Firestore] addTeamToTournament: ${teamName}`);
    const teamDocRef = doc(collection(tournamentRef, 'teams'));
    const team: Team = { ref: teamDocRef, name: teamName, ...(comment ? { comment } : {}) };
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] setDoc: team`);
      await setDoc(teamDocRef, { name: teamName, ...(comment ? { comment } : {}) });
    });
    return team;
  }

  async updateTeamInTournament(tournamentRef: DocumentReference, team: Team): Promise<void> {
    console.debug(`[Firestore] updateTeamInTournament: ${team.name}`);
    const teamDocRef = doc(collection(tournamentRef, 'teams'), team.ref.id);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: team`);
      await updateDoc(teamDocRef, { name: team.name, comment: team.comment ?? null });
    });
  }

  async deleteTeamFromTournament(tournamentRef: DocumentReference, teamRef: string): Promise<void> {
    console.debug(`[Firestore] deleteTeamFromTournament: id=${teamRef}`);
    const teamDocRef = doc(collection(tournamentRef, 'teams'), teamRef);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: team`);
      await deleteDoc(teamDocRef);
    });
  }

  async queueMail(to: string, subject: string, html: string): Promise<void> {
    console.debug(`[Firestore] queueMail: to=${to}`);
    if (!this.firestore) {
      return;
    }

    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] addDoc: mail`);
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
    console.debug(`[Firestore] addSeriesToTournament: ${name}`);
    const serieDocRef = doc(collection(tournamentRef, 'series'));
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] setDoc: serie`);
      await setDoc(serieDocRef, { name });
    });
    return serieDocRef;
  }

  async updateSerieInTournament(serieRef: DocumentReference, name: string): Promise<void> {
    console.debug(`[Firestore] updateSerieInTournament: ${name}`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: serie`);
      await updateDoc(serieRef, { name });
    });
  }

  async deleteSerieFromTournament(serieRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteSerieFromTournament: deleting serie and nested poules`);
    const pouleDocs = await this.getCollectionFromDocumentRef(serieRef, 'poules');
    for (const pouleDoc of pouleDocs) {
      await this.deletePouleFromSerie(pouleDoc.ref);
    }

    await this.deleteFinaleGamesForSerie(serieRef);

    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: serie`);
      await deleteDoc(serieRef);
    });
  }

  async addPouleToSerie(serieRef: DocumentReference, name: string): Promise<DocumentReference> {
    console.debug(`[Firestore] addPouleToSerie: ${name}`);
    const pouleDocRef = doc(collection(serieRef, 'poules'));
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] setDoc: poule`);
      await setDoc(pouleDocRef, { name, refTeams: [] });
    });
    return pouleDocRef;
  }

  async updatePouleInSerie(pouleRef: DocumentReference, name: string): Promise<void> {
    console.debug(`[Firestore] updatePouleInSerie: ${name}`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: poule`);
      await updateDoc(pouleRef, { name });
    });
  }

  async deletePouleFromSerie(pouleRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deletePouleFromSerie: deleting poule and nested games`);
    await this.deletePouleGames(pouleRef);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: poule`);
      await deleteDoc(pouleRef);
    });
  }

  async addTeamRefToPoule(pouleRef: DocumentReference, teamRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] addTeamRefToPoule: adding team to poule`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: poule (arrayUnion)`);
      await updateDoc(pouleRef, { refTeams: arrayUnion(teamRef) });
    });
  }

  async removeTeamRefFromPoule(
    pouleRef: DocumentReference,
    teamRef: DocumentReference,
  ): Promise<void> {
    console.debug(`[Firestore] removeTeamRefFromPoule: removing team from poule`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: poule (arrayRemove)`);
      await updateDoc(pouleRef, { refTeams: arrayRemove(teamRef) });
    });
  }

  async deletePouleGames(pouleRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deletePouleGames: deleting all games from poule`);
    const gameDocs = await this.getCollectionFromDocumentRef(pouleRef, 'games');
    for (const gameDoc of gameDocs) {
      await runInInjectionContext(this.environmentInjector, async () => {
        console.debug(`[Firestore] deleteDoc: game`);
        await deleteDoc(gameDoc.ref);
      });
    }
  }

  async addGameToPoule(
    pouleRef: DocumentReference,
    gameData: Omit<Game, 'ref'>,
  ): Promise<DocumentReference> {
    console.debug(`[Firestore] addGameToPoule: adding game`);
    const gameDocRef = doc(collection(pouleRef, 'games'));
    const data: Record<string, unknown> = {
      refTeam1: gameData.refTeam1,
      refTeam2: gameData.refTeam2,
    };
    if (gameData.scoreTeam1 != null) data['scoreTeam1'] = gameData.scoreTeam1;
    if (gameData.scoreTeam2 != null) data['scoreTeam2'] = gameData.scoreTeam2;
    if (gameData.date != null) data['date'] = gameData.date;
    if (gameData.referees != null && gameData.referees.length > 0)
      data['referees'] = gameData.referees;
    if (gameData.comment != null) data['comment'] = gameData.comment;
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] setDoc: game`);
      await setDoc(gameDocRef, data);
    });
    return gameDocRef;
  }

  async updateGame(
    gameRef: DocumentReference,
    gameData: Partial<Omit<Game, 'ref'>>,
  ): Promise<void> {
    console.debug(`[Firestore] updateGame: updating game`);
    const data: Record<string, unknown> = {};
    if (gameData.refTeam1 !== undefined) data['refTeam1'] = gameData.refTeam1;
    if (gameData.refTeam2 !== undefined) data['refTeam2'] = gameData.refTeam2;
    data['scoreTeam1'] = gameData.scoreTeam1 ?? null;
    data['scoreTeam2'] = gameData.scoreTeam2 ?? null;
    data['date'] = gameData.date ?? null;
    data['referees'] = gameData.referees?.length ? gameData.referees : null;
    data['comment'] = gameData.comment ?? null;
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: game`);
      await updateDoc(gameRef, data);
    });
  }

  async deleteGameFromPoule(gameRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteGameFromPoule: deleting game`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: game`);
      await deleteDoc(gameRef);
    });
  }

  async deleteTournament(tournamentRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteTournament: deleting all tournament data`);
    if (!this.firestore) {
      return;
    }

    // Delete all users associated with this tournament
    const users = await this.getUsersByTournament(tournamentRef);
    await Promise.all(users.map((user) => this.deleteUserDoc(user.ref!)));

    // Delete all teams
    const teams = await this.getCollectionFromDocumentRef(tournamentRef, 'teams');
    await Promise.all(
      teams.map((item) =>
        runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] deleteDoc: team (deleteTournament)`);
          await deleteDoc(item.ref);
        }),
      ),
    );

    // Delete all series (with their poules and games)
    const series = await this.getCollectionFromDocumentRef(tournamentRef, 'series');
    await Promise.all(series.map((item) => this.deleteSerieFromTournament(item.ref)));

    // Delete all time slots
    const timeSlots = await this.getCollectionFromDocumentRef(tournamentRef, 'timeSlots');
    await Promise.all(
      timeSlots.map((item) =>
        runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] deleteDoc: timeSlot (deleteTournament)`);
          await deleteDoc(item.ref);
        }),
      ),
    );

    // Delete the tournament document itself
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: tournament`);
      await deleteDoc(tournamentRef);
    });
  }

  async importTournamentData(
    tournamentRef: DocumentReference,
    data: TournamentYamlData,
  ): Promise<void> {
    console.debug(`[Firestore] importTournamentData: starting bulk import`);
    if (!this.firestore) {
      return;
    }

    // Delete existing teams
    console.debug(`[Firestore] importTournamentData: deleting existing teams`);
    const existingTeams = await this.getCollectionFromDocumentRef(tournamentRef, 'teams');
    await Promise.all(
      existingTeams.map((item) =>
        runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] deleteDoc: team (batch import)`);
          await deleteDoc(item.ref);
        }),
      ),
    );

    // Delete existing series (with their poules and games)
    console.debug(`[Firestore] importTournamentData: deleting existing series`);
    const existingSeries = await this.getCollectionFromDocumentRef(tournamentRef, 'series');
    await Promise.all(existingSeries.map((item) => this.deleteSerieFromTournament(item.ref)));

    // Delete existing time slots
    console.debug(`[Firestore] importTournamentData: deleting existing timeSlots`);
    const existingTimeSlots = await this.getCollectionFromDocumentRef(tournamentRef, 'timeSlots');
    await Promise.all(
      existingTimeSlots.map((item) =>
        runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] deleteDoc: timeSlot (batch import)`);
          await deleteDoc(item.ref);
        }),
      ),
    );

    // Create new teams and build id mapping (yaml id -> new DocumentReference)
    console.debug(`[Firestore] importTournamentData: creating new teams`);
    const teamIdMap = new Map<string, DocumentReference>();
    await Promise.all(
      data.teams.map(async (yamlTeam) => {
        const teamDocRef = doc(collection(tournamentRef, 'teams'));
        await runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] setDoc: team (batch import)`);
          const teamData: Record<string, unknown> = { name: yamlTeam.name };
          if (yamlTeam.comment) {
            teamData['comment'] = yamlTeam.comment;
          }
          await setDoc(teamDocRef, teamData);
        });
        teamIdMap.set(yamlTeam.id, teamDocRef);
      }),
    );

    // Create new series with poules and games
    console.debug(`[Firestore] importTournamentData: creating series with poules and games`);
    for (const yamlSerie of data.series) {
      const serieDocRef = doc(collection(tournamentRef, 'series'));
      await runInInjectionContext(this.environmentInjector, async () => {
        console.debug(`[Firestore] setDoc: serie (batch import)`);
        await setDoc(serieDocRef, { name: yamlSerie.name });
      });

      for (const yamlPoule of yamlSerie.poules ?? []) {
        const refTeams = (yamlPoule.teams ?? [])
          .map((id) => teamIdMap.get(id))
          .filter((ref): ref is DocumentReference => ref != null);

        const pouleDocRef = doc(collection(serieDocRef, 'poules'));
        await runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] setDoc: poule (batch import)`);
          await setDoc(pouleDocRef, { name: yamlPoule.name, refTeams });
        });

        for (const yamlGame of yamlPoule.games ?? []) {
          const refTeam1 = teamIdMap.get(yamlGame.team1);
          const refTeam2 = teamIdMap.get(yamlGame.team2);
          if (!refTeam1 || !refTeam2) {
            continue;
          }

          const gameDocRef = doc(collection(pouleDocRef, 'games'));
          const gameData: Record<string, unknown> = { refTeam1, refTeam2 };
          if (yamlGame.score1 != null) gameData['scoreTeam1'] = yamlGame.score1;
          if (yamlGame.score2 != null) gameData['scoreTeam2'] = yamlGame.score2;
          if (yamlGame.date != null) gameData['date'] = new Date(yamlGame.date);
          if (Array.isArray(yamlGame.referees) && yamlGame.referees.length > 0) {
            gameData['referees'] = yamlGame.referees
              .map((referee) => referee.trim())
              .filter((referee) => referee.length > 0);
          }
          if (yamlGame.comment) {
            const trimmedComment = yamlGame.comment.trim();
            if (trimmedComment.length > 0) {
              gameData['comment'] = trimmedComment;
            }
          }
          await runInInjectionContext(this.environmentInjector, async () => {
            console.debug(`[Firestore] setDoc: game (batch import)`);
            await setDoc(gameDocRef, gameData);
          });
        }
      }
    }

    // Import time slots
    if (Array.isArray(data.timeSlots) && data.timeSlots.length > 0) {
      console.debug(`[Firestore] importTournamentData: creating timeSlots`);
      await Promise.all(
        data.timeSlots.map(async (isoDate) => {
          const date = new Date(isoDate);
          if (isNaN(date.getTime())) return;
          const slotDocRef = doc(collection(tournamentRef, 'timeSlots'));
          await runInInjectionContext(this.environmentInjector, async () => {
            console.debug(`[Firestore] setDoc: timeSlot (batch import)`);
            await setDoc(slotDocRef, { date });
          });
        }),
      );
    }
  }

  watchTimeSlots(tournamentRef: DocumentReference): Observable<TimeSlot[]> {
    console.debug(`[Firestore] watchTimeSlots: ${tournamentRef.path}`);
    if (!this.firestore) {
      return of([]);
    }
    return collectionSnapshots(collection(tournamentRef, 'timeSlots')).pipe(
      map((snapshots) =>
        snapshots
          .map((snap) => {
            const data = snap.data() as { date?: unknown };
            const date = this.parseFirestoreDate(data.date);
            if (!date) return null;
            return { ref: snap.ref, date } as TimeSlot;
          })
          .filter((ts): ts is TimeSlot => ts !== null)
          .sort((a, b) => a.date.getTime() - b.date.getTime()),
      ),
    );
  }

  async addTimeSlot(tournamentRef: DocumentReference, date: Date): Promise<DocumentReference> {
    console.debug(`[Firestore] addTimeSlot: ${date.toISOString()}`);
    const slotDocRef = doc(collection(tournamentRef, 'timeSlots'));
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] setDoc: timeSlot`);
      await setDoc(slotDocRef, { date });
    });
    return slotDocRef;
  }

  async deleteTimeSlot(timeSlotRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteTimeSlot`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: timeSlot`);
      await deleteDoc(timeSlotRef);
    });
  }

  private parseFirestoreDate(value: unknown): Date | undefined {
    if (!value) return undefined;
    if (typeof (value as { toDate?: unknown }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    return new Date(value as string);
  }

  async setSerieFinaleSize(serieRef: DocumentReference, size: number): Promise<void> {
    console.debug(`[Firestore] setSerieFinaleSize: size=${size}`);
    await runInInjectionContext(this.environmentInjector, async () => {
      await updateDoc(serieRef, { finaleSize: size });
    });
  }

  private getRoundName(size: number): string {
    return `finale.rounds.${size}`;
  }

  async generateFinaleGamesForSerie(
    serieRef: DocumentReference,
    serieName: string,
    finaleSize: number,
  ): Promise<void> {
    console.debug(`[Firestore] generateFinaleGamesForSerie: finaleSize=${finaleSize}`);
    await this.deleteFinaleGamesForSerie(serieRef);

    const allRoundNames: { name: string; size: number }[] = [];
    let currentSize = finaleSize;
    while (currentSize >= 2) {
      allRoundNames.push({ name: this.getRoundName(currentSize), size: currentSize });
      currentSize = Math.floor(currentSize / 2);
    }

    let prevRoundName: string | null = null;
    for (const { name: roundName, size: roundSize } of allRoundNames) {
      const matchCount = roundSize / 2;
      for (let matchNumber = 1; matchNumber <= matchCount; matchNumber++) {
        const gameData: Record<string, unknown> = {
          name: `${serieName} - ${roundName} ${matchNumber}`,
          round: roundName,
          roundOrder: roundSize,
          matchNumber,
        };
        if (prevRoundName) {
          gameData['team1Placeholder'] = `finale.winnerOf:${prevRoundName}:${2 * matchNumber - 1}`;
          gameData['team2Placeholder'] = `finale.winnerOf:${prevRoundName}:${2 * matchNumber}`;
        }
        const gameDocRef = doc(collection(serieRef, 'finaleGames'));
        await runInInjectionContext(this.environmentInjector, async () => {
          console.debug(`[Firestore] setDoc: finaleGame`);
          await setDoc(gameDocRef, gameData);
        });
      }
      prevRoundName = roundName;
    }
  }

  async deleteFinaleGamesForSerie(serieRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteFinaleGamesForSerie`);
    const gameDocs = await this.getCollectionFromDocumentRef(serieRef, 'finaleGames');
    for (const gameDoc of gameDocs) {
      await runInInjectionContext(this.environmentInjector, async () => {
        console.debug(`[Firestore] deleteDoc: finaleGame`);
        await deleteDoc(gameDoc.ref);
      });
    }
  }

  watchFinaleGamesForSerie(
    serieRef: DocumentReference,
  ): Observable<{ data: unknown; ref: DocumentReference }[]> {
    return this.watchCollectionFromDocumentRef(serieRef, 'finaleGames');
  }

  async updateFinaleGame(
    gameRef: DocumentReference,
    data: Partial<Omit<FinaleGame, 'ref'>>,
  ): Promise<void> {
    console.debug(`[Firestore] updateFinaleGame`);
    const updateData: Record<string, unknown> = {};
    if (data.refTeam1 !== undefined) updateData['refTeam1'] = data.refTeam1;
    if (data.refTeam2 !== undefined) updateData['refTeam2'] = data.refTeam2;
    if ('scoreTeam1' in data) updateData['scoreTeam1'] = data.scoreTeam1 ?? null;
    if ('scoreTeam2' in data) updateData['scoreTeam2'] = data.scoreTeam2 ?? null;
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] updateDoc: finaleGame`);
      await updateDoc(gameRef, updateData);
    });
  }

  async deleteFinaleGame(gameRef: DocumentReference): Promise<void> {
    console.debug(`[Firestore] deleteFinaleGame`);
    await runInInjectionContext(this.environmentInjector, async () => {
      console.debug(`[Firestore] deleteDoc: finaleGame`);
      await deleteDoc(gameRef);
    });
  }
}
