import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { DocumentReference } from '@angular/fire/firestore';
import { vi } from 'vitest';

import { TournamentsStore } from './tournaments.store';
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

describe('TournamentsStore', () => {
  let store: InstanceType<typeof TournamentsStore>;
  let firebaseService: {
    isAvailable: ReturnType<typeof vi.fn>;
    watchTournaments: ReturnType<typeof vi.fn>;
  };
  let tournaments$: Subject<Tournament[]>;

  beforeEach(() => {
    tournaments$ = new Subject<Tournament[]>();
    firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      watchTournaments: vi.fn().mockReturnValue(tournaments$.asObservable()),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseService, useValue: firebaseService as unknown as FirebaseService },
      ],
    });

    store = TestBed.inject(TournamentsStore);
  });

  it('should start loading and subscribe once', () => {
    store.ensureLoaded();
    store.ensureLoaded();

    expect(firebaseService.watchTournaments).toHaveBeenCalledTimes(1);
    expect(store.loading()).toBe(true);
    expect(store.listenerStartCount()).toBe(1);
  });

  it('should set tournaments when data arrives', () => {
    store.ensureLoaded();
    tournaments$.next([createTournament('t1', 'My Tournament')]);

    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.tournaments().length).toBe(1);
    expect(store.tournaments()[0].name).toBe('My Tournament');
  });

  it('should handle unavailable firebase without subscribing', () => {
    firebaseService.isAvailable.mockReturnValue(false);

    store.ensureLoaded();

    expect(firebaseService.watchTournaments).not.toHaveBeenCalled();
    expect(store.loaded()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.tournaments()).toEqual([]);
  });

  it('should expose error when stream fails', () => {
    store.ensureLoaded();
    tournaments$.error(new Error('boom'));

    expect(store.loading()).toBe(false);
    expect(store.loaded()).toBe(false);
    expect(store.error()).toBe('boom');
  });

  it('should allow retry after stream error', () => {
    store.ensureLoaded();
    tournaments$.error(new Error('boom'));

    tournaments$ = new Subject<Tournament[]>();
    firebaseService.watchTournaments.mockReturnValue(tournaments$.asObservable());

    store.ensureLoaded();

    expect(firebaseService.watchTournaments).toHaveBeenCalledTimes(2);
  });
});
