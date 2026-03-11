import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import { routes } from "./app.routes";
import { providePrimeNG } from "primeng/config";
import Aura from "@primeuix/themes/aura";
import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { getFirestore, provideFirestore } from "@angular/fire/firestore";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
    }),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: "txapelketak-ac529",
        appId: "1:210687482712:web:22ae72552902c05891e32d",
        storageBucket: "txapelketak-ac529.firebasestorage.app",
        apiKey: "AIzaSyAml_FZRsRZjrClzGdbqyWkWTEQ3SKmTlA",
        authDomain: "txapelketak-ac529.firebaseapp.com",
        messagingSenderId: "210687482712",
      }),
    ),
    provideFirestore(() => getFirestore()),
  ],
};
