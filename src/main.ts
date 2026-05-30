import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localeEu from '@angular/common/locales/eu';
import localeFr from '@angular/common/locales/fr';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

registerLocaleData(localeFr, 'fr');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeEs, 'es');
registerLocaleData(localeEu, 'eu');

if (environment.production || localStorage.getItem('debug') !== 'true') {
  console.debug = () => undefined;
}

async function cleanupLegacyServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
  }
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

void cleanupLegacyServiceWorkers().catch((error) =>
  console.warn('Service worker cleanup failed', error),
);
