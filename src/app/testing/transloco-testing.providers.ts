import { TranslocoTestingModule, TranslocoTestingOptions } from '@jsverse/transloco';
import frTranslation from '../../../public/i18n/fr.json';

const translocoOptions: TranslocoTestingOptions = {
  langs: { fr: frTranslation },
  translocoConfig: {
    availableLangs: ['fr'],
    defaultLang: 'fr',
  },
  preloadLangs: true,
};

export function provideTranslocoTesting() {
  return TranslocoTestingModule.forRoot(translocoOptions).providers ?? [];
}
