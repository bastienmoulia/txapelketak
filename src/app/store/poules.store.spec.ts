import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { vi } from 'vitest';

import { PoulesStore } from './poules.store';
import { FirebaseService } from '../shared/services/firebase.service';
import { Team } from '../tournaments/types/shared/teams/teams';

function createRef(id: string): DocumentReference {
  return { id, path: id } as DocumentReference;
}

describe('PoulesStore', () => {
  let store: InstanceType<typeof PoulesStore>;
  let firebaseService: {
    isAvailable: ReturnType<typeof vi.fn>;
    watchCollectionFromDocumentRef: ReturnType<typeof vi.fn>;
    getCollectionFromDocumentRef: ReturnType<typeof vi.fn>;
  };

  let teams$: Subject<{ data: unknown; ref: DocumentReference }[]>;
  let series$: Subject<{ data: unknown; ref: DocumentReference }[]>;
  let gameStreams: Map<string, Subject<{ data: unknown; ref: DocumentReference }[]>>;

  beforeEach(() => {
    teams$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    series$ = new Subject<{ data: unknown; ref: DocumentReference }[]>();
    gameStreams = new Map();

    firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      watchCollectionFromDocumentRef: vi.fn(),
      getCollectionFromDocumentRef: vi.fn().mockResolvedValue([]),
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
        return new Subject<{ data: unknown; ref: DocumentReference }[]>().asObservable();
      },
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: firebaseService as unknown as FirebaseService },
      ],
    });

    store = TestBed.inject(PoulesStore);
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
});
