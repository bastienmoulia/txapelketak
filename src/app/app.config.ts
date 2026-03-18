import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { connectFirestoreEmulator, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

const TxapelketaTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{orange.50}',
      100: '{orange.100}',
      200: '{orange.200}',
      300: '{orange.300}',
      400: '{orange.400}',
      500: '{orange.500}',
      600: '{orange.600}',
      700: '{orange.700}',
      800: '{orange.800}',
      900: '{orange.900}',
      950: '{orange.950}',
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: TxapelketaTheme,
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
