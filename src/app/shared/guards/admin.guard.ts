import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, first, map } from 'rxjs';
import { AuthStore } from '../../store/auth.store';

export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.initialized()) {
    return authStore.role() === 'admin' || router.parseUrl('/');
  }

  return toObservable(authStore.initialized).pipe(
    filter((initialized) => initialized),
    first(),
    map(() => authStore.role() === 'admin' || router.parseUrl('/')),
  );
};
