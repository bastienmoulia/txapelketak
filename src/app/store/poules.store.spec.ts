import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { vi } from 'vitest';

import { PoulesStore } from './poules.store';
import { FirebaseService } from '../shared/services/firebase.service';
import { Team, TimeSlot } from '../tournaments/models';
import { AuthStore } from './auth.store';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('PoulesStore', () => {
  let store: InstanceType<typeof PoulesStore>;
  let authStore: InstanceType<typeof AuthStore>;
  let firebaseService: {
    isAvailable: ReturnType<typeof vi.fn>;
    watchCollectionFromDocumentRef: ReturnType<typeof vi.fn>;
    getCollectionFromDocumentRef: ReturnType<typeof vi.fn>;
    watchTimeSlots: ReturnType<typeof vi.fn>;
    watchFinaleGamesForSerie: ReturnType<typeof vi.fn>;
  };

  let teams$: Subject<{ data: unknown; ref: DocumentReference }[]>;
  let series$: Subject<{ data: unknown; ref: DocumentReference }[]>;
  let timeSlots$: Subject<TimeSlot[]>;
  let gameStreams: Map<string, Subject<{ data: unknown; ref: DocumentReference }[]>>;
  let pouleStreams: Map<string, Subject<{ data: unknown; ref: DocumentReference }[]>>;
  let playoffStreams: Map<string, Subject<{ data: unknown; ref: DocumentReference }[]>>;

  beforeEach(() => {
    teams$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    series$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    timeSlots$ = new Subject<TimeSlot[]>();
    gameStreams = new Map();
    pouleStreams = new Map();
    playoffStreams = new Map();

    firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      watchCollectionFromDocumentRef: vi.fn(),
      getCollectionFromDocumentRef: vi.fn().mockResolvedValue([]),
      watchTimeSlots: vi.fn().mockReturnValue(timeSlots$.asObservable()),
      watchFinaleGamesForSerie: vi
        .fn()
        .mockReturnValue(new Subject<{ data: unknown; ref: DocumentReference }[]>().asObservable()),
    };

    firebaseService.watchCollectionFromDocumentRef.mockImplementation(
      (_ref: DocumentReference, collectionName: string) => {
        if (collectionName === 'teams') {
          return teams$.asObservable();
        }
        if (collectionName === 'series') {
          return series$.asObservable();
        }
        if (collectionName === 'games') {
          const key = _ref.id;
          const stream =
            gameStreams.get(key) ?? new Subject<{ data: unknown; ref: DocumentReference }[]>();
          gameStreams.set(key, stream);
          return stream.asObservable();
        }
        if (collectionName === 'poules') {
          const key = _ref.id;
          const stream =
            pouleStreams.get(key) ?? new Subject<{ data: unknown; ref: DocumentReference }[]>();
          pouleStreams.set(key, stream);
          return stream.asObservable();
        }
        if (collectionName === 'playoffs') {
          const key = _ref.id;
          const stream =
            playoffStreams.get(key) ?? new Subject<{ data: unknown; ref: DocumentReference }[]>();
          playoffStreams.set(key, stream);
          return stream.asObservable();
        }
        return new Subject<{ data: unknown; ref: DocumentReference }[]>().asObservable();
      },
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: firebaseService as unknown as FirebaseService },
      ],
    });

    store = TestBed.inject(PoulesStore);
    authStore = TestBed.inject(AuthStore);
  });

  it('should set active id and not subscribe when firebase is unavailable', () => {
    firebaseService.isAvailable.mockReturnValue(false);

    store.startWatching(createRef('t1'));

    expect(firebaseService.watchCollectionFromDocumentRef).not.toHaveBeenCalled();
    expect(store.activeTournamentId()).toBe('t1');
    expect(store.loading()).toBe(false);
  });

  it('should subscribe once for the same tournament id', () => {
    const ref = createRef('t1');

    store.startWatching(ref);
    store.startWatching(ref);

    const teamsCalls = firebaseService.watchCollectionFromDocumentRef.mock.calls.filter(
      ([, collectionName]) => collectionName === 'teams',
    );
    const seriesCalls = firebaseService.watchCollectionFromDocumentRef.mock.calls.filter(
      ([, collectionName]) => collectionName === 'series',
    );

    expect(teamsCalls.length).toBe(1);
    expect(seriesCalls.length).toBe(1);
  });

  it('should update teams from teams watcher', () => {
    store.startWatching(createRef('t1'));

    teams$.next([
      {
        data: { name: 'Team A' },
        ref: createRef('team-a'),
      },
    ]);

    expect(store.teams().length).toBe(1);
    expect(store.teams()[0].name).toBe('Team A');
  });

  it('should allow retry after teams watcher error', () => {
    const ref = createRef('t1');
    store.startWatching(ref);
    teams$.error(new Error('teams failed'));

    teams$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    series$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    timeSlots$ = new Subject<TimeSlot[]>();
    firebaseService.watchCollectionFromDocumentRef.mockImplementation(
      (_docRef: DocumentReference, collectionName: string) => {
        if (collectionName === 'teams') {
          return teams$.asObservable();
        }
        if (collectionName === 'series') {
          return series$.asObservable();
        }
        return new Subject<{ data: unknown; ref: DocumentReference }[]>().asObservable();
      },
    );
    firebaseService.watchTimeSlots.mockReturnValue(timeSlots$.asObservable());

    store.startWatching(ref);

    const teamsCalls = firebaseService.watchCollectionFromDocumentRef.mock.calls.filter(
      ([, collectionName]) => collectionName === 'teams',
    );
    expect(teamsCalls.length).toBe(2);
  });

  it('should allow retry after series watcher error', () => {
    const ref = createRef('t1');
    store.startWatching(ref);
    series$.error(new Error('series failed'));

    teams$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    series$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    timeSlots$ = new Subject<TimeSlot[]>();
    firebaseService.watchCollectionFromDocumentRef.mockImplementation(
      (_docRef: DocumentReference, collectionName: string) => {
        if (collectionName === 'teams') {
          return teams$.asObservable();
        }
        if (collectionName === 'series') {
          return series$.asObservable();
        }
        return new Subject<{ data: unknown; ref: DocumentReference }[]>().asObservable();
      },
    );
    firebaseService.watchTimeSlots.mockReturnValue(timeSlots$.asObservable());

    store.startWatching(ref);

    const seriesCalls = firebaseService.watchCollectionFromDocumentRef.mock.calls.filter(
      ([, collectionName]) => collectionName === 'series',
    );
    expect(seriesCalls.length).toBe(2);
  });

  it('should allow local patch helpers', () => {
    const patchedTeams: Team[] = [{ ref: createRef('t-1'), name: 'Team 1' } as Team];

    store.patchTeams(patchedTeams);
    store.patchSeries([]);

    expect(store.teams()).toEqual(patchedTeams);
    expect(store.series()).toEqual([]);
  });

  it('should reset state on stopWatching', () => {
    store.startWatching(createRef('t1'));
    teams$.next([{ data: { name: 'Team A' }, ref: createRef('team-a') }]);

    store.stopWatching();

    expect(store.activeTournamentId()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.teams()).toEqual([]);
    expect(store.series()).toEqual([]);
  });

  it('should expose error when a game watcher fails', async () => {
    firebaseService.getCollectionFromDocumentRef.mockResolvedValue([
      { data: { name: 'Poule A' }, ref: createRef('p1') },
    ]);

    store.startWatching(createRef('t1'));
    series$.next([{ data: { name: 'Serie A' }, ref: createRef('s1') }]);

    for (let attempt = 0; attempt < 5 && !gameStreams.get('p1'); attempt++) {
      await Promise.resolve();
    }

    const gamesStream = gameStreams.get('p1');
    expect(gamesStream).toBeDefined();
    gamesStream?.error(new Error('games failed'));

    expect(store.error()).toBe('games failed');
  });

  it('should hide hidden poules and playoffs for visitors', async () => {
    firebaseService.getCollectionFromDocumentRef.mockResolvedValue([
      { data: { name: 'Visible Poule' }, ref: createRef('p-visible') },
      {
        data: { name: 'Hidden Poule', hiddenFromVisitors: true },
        ref: createRef('p-hidden'),
      },
    ]);

    store.startWatching(createRef('t1'));
    series$.next([{ data: { name: 'Serie A' }, ref: createRef('s1') }]);

    await Promise.resolve();
    await Promise.resolve();

    playoffStreams.get('s1')?.next([
      { data: { name: 'Visible Playoff', orderedTeamRefs: [], size: 2 }, ref: createRef('pl-visible') },
      {
        data: { name: 'Hidden Playoff', orderedTeamRefs: [], size: 2, hiddenFromVisitors: true },
        ref: createRef('pl-hidden'),
      },
    ]);

    expect(store.series()[0].poules?.map((poule) => poule.name)).toEqual(['Visible Poule']);
    expect(store.series()[0].playoffs?.map((playoff) => playoff.name)).toEqual(['Visible Playoff']);

    const gameCalls = firebaseService.watchCollectionFromDocumentRef.mock.calls.filter(
      ([, collectionName]) => collectionName === 'games',
    );
    expect(gameCalls.map(([ref]) => (ref as DocumentReference).id)).toContain('p-visible');
    expect(gameCalls.map(([ref]) => (ref as DocumentReference).id)).not.toContain('p-hidden');
  });

  it('should keep hidden poules and playoffs for admins', async () => {
    authStore.setUser({ role: 'admin' } as never);
    firebaseService.getCollectionFromDocumentRef.mockResolvedValue([
      { data: { name: 'Visible Poule' }, ref: createRef('p-visible') },
      {
        data: { name: 'Hidden Poule', hiddenFromVisitors: true },
        ref: createRef('p-hidden'),
      },
    ]);

    store.startWatching(createRef('t1'));
    series$.next([{ data: { name: 'Serie A' }, ref: createRef('s1') }]);

    await Promise.resolve();
    await Promise.resolve();

    playoffStreams.get('s1')?.next([
      { data: { name: 'Visible Playoff', orderedTeamRefs: [], size: 2 }, ref: createRef('pl-visible') },
      {
        data: { name: 'Hidden Playoff', orderedTeamRefs: [], size: 2, hiddenFromVisitors: true },
        ref: createRef('pl-hidden'),
      },
    ]);

    expect(store.series()[0].poules?.map((poule) => poule.name)).toEqual([
      'Visible Poule',
      'Hidden Poule',
    ]);
    expect(store.series()[0].playoffs?.map((playoff) => playoff.name)).toEqual([
      'Visible Playoff',
      'Hidden Playoff',
    ]);
  });
});
