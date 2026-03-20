import { bootstrapApplication } from '@angular/platform-browser';
import { registerLocaleData } from '@angular/common';
import localeEn from '@angular/common/locales/en';
import localeEs from '@angular/common/locales/es';
import localeEu from '@angular/common/locales/eu';
import localeFr from '@angular/common/locales/fr';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeFr, 'fr');
registerLocaleData(localeEn, 'en');
registerLocaleData(localeEs, 'es');
registerLocaleData(localeEu, 'eu');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
