import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, first, map } from 'rxjs';
import { AuthStore } from '../../store/auth.store';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  console.log('AdminGuard: Checking access...');

  if (authStore.initialized()) {
    console.log('AdminGuard: Auth state initialized. User role:', authStore.role());
    return authStore.role() === 'admin' || router.parseUrl('/');
  }

  return toObservable(authStore.initialized).pipe(
    filter((initialized) => initialized),
    first(),
    map(() => {
      console.log('AdminGuard: Auth state initialized 2. User role:', authStore.role());
      return authStore.role() === 'admin' || router.parseUrl('/');
    }),
  );
};
