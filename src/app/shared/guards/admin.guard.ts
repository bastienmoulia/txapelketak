import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../../store/auth.store';

/**
 * Route guard that allows only admin users to access a route.
 * Used to protect admin-only features that should not be accessible
 * through direct URL navigation, even if the route is exposed.
 */
export const adminGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.role() === 'admin') {
    return true;
  }

  // Redirect non-admin users to the parent tournament detail page
  return router.parseUrl('/');
};
