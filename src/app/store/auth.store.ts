import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { User, UserRole } from '../home/tournament.interface';

interface AuthState {
  currentUser: User | null;
  initialized: boolean;
}

const initialState: AuthState = {
  currentUser: null,
  initialized: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    role: computed((): UserRole | '' => store.currentUser()?.role ?? ''),
  })),
  withMethods((store) => ({
    setUser(user: User | null): void {
      patchState(store, { currentUser: user, initialized: true });
    },
    clear(): void {
      patchState(store, { currentUser: null, initialized: true });
    },
  })),
);
