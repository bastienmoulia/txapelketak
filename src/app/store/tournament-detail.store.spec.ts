import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { vi } from 'vitest';

import { TournamentDetailStore } from './tournament-detail.store';
import { FirebaseService } from '../shared/services/firebase.service';
import { Tournament } from '../home/tournament.interface';

function createTournament(id: string, name = 'Tournament'): Tournament {
  return {
    ref: { id } as DocumentReference,
    name,
    description: '',
    type: 'poules',
    status: 'ongoing',
    createdAt: new Date().toISOString(),
  };
}

describe('TournamentDetailStore', () => {
  let store: InstanceType<typeof TournamentDetailStore>;
  let firebaseService: {
    isAvailable: ReturnType<typeof vi.fn>;
    watchTournamentById: ReturnType<typeof vi.fn>;
    getTournamentById: ReturnType<typeof vi.fn>;
  };
  let tournament$: Subject<Tournament | null>;

  beforeEach(() => {
    tournament$ = new Subject<Tournament | null>();
    firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      watchTournamentById: vi.fn().mockReturnValue(tournament$.asObservable()),
      getTournamentById: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: firebaseService as unknown as FirebaseService },
      ],
    });

    store = TestBed.inject(TournamentDetailStore);
  });

  it('should mark missing id as not found', () => {
    store.startWatching('');

    expect(store.notFound()).toBe(true);
    expect(store.error()).toBe('Missing tournament id');
    expect(firebaseService.watchTournamentById).not.toHaveBeenCalled();
  });

  it('should subscribe once for same tournament id', () => {
    store.startWatching('t1');
    store.startWatching('t1');

    expect(firebaseService.watchTournamentById).toHaveBeenCalledTimes(1);
    expect(store.loading()).toBe(true);
    expect(store.activeTournamentId()).toBe('t1');
  });

  it('should set tournament from watcher emission', () => {
    store.startWatching('t1');
    tournament$.next(createTournament('t1', 'Detail Name'));

    expect(store.loading()).toBe(false);
    expect(store.notFound()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.tournament()?.name).toBe('Detail Name');
  });

  it('should allow retry with same id after watcher error', () => {
    store.startWatching('t1');
    tournament$.error(new Error('boom'));

    tournament$ = new Subject<Tournament | null>();
    firebaseService.watchTournamentById.mockReturnValue(tournament$.asObservable());

    store.startWatching('t1');

    expect(firebaseService.watchTournamentById).toHaveBeenCalledTimes(2);
  });

  it('should use cached name in loadTournamentName when active tournament matches', async () => {
    store.startWatching('t1');
    tournament$.next(createTournament('t1', 'Cached Name'));

    const name = await store.loadTournamentName('t1');

    expect(name).toBe('Cached Name');
    expect(firebaseService.getTournamentById).not.toHaveBeenCalled();
  });

  it('should fetch and cache name when not already active', async () => {
    firebaseService.getTournamentById.mockResolvedValue(createTournament('t2', 'Fetched Name'));

    const name = await store.loadTournamentName('t2');

    expect(firebaseService.getTournamentById).toHaveBeenCalledWith('t2');
    expect(name).toBe('Fetched Name');
    expect(store.activeTournamentId()).toBe('t2');
    expect(store.tournament()?.name).toBe('Fetched Name');
  });

  it('should set notFound when fetched tournament does not exist', async () => {
    firebaseService.getTournamentById.mockResolvedValue(null);

    const name = await store.loadTournamentName('missing-id');

    expect(name).toBeNull();
    expect(store.notFound()).toBe(true);
    expect(store.activeTournamentId()).toBe('missing-id');
  });
});
