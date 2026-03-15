import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'txapelketak-ac529',
        appId: '1:210687482712:web:22ae72552902c05891e32d',
        storageBucket: 'txapelketak-ac529.firebasestorage.app',
        apiKey: 'AIzaSyAml_FZRsRZjrClzGdbqyWkWTEQ3SKmTlA',
        authDomain: 'txapelketak-ac529.firebaseapp.com',
        messagingSenderId: '210687482712',
      }),
    ),
    provideFirestore(() => {
      const firestore = getFirestore();

      if (environment.useFirestoreEmulator) {
        try {
          connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
        } catch (error) {
          console.warn('Could not connect to Firestore emulator', error);
        }
      }

      return firestore;
    }),
    provideHttpClient(),
    provideTransloco({
      config: {
        availableLangs: ['fr', 'eu', 'en', 'es'],
        defaultLang: 'fr',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
