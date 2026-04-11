import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { PrimeNG } from 'primeng/config';

const PRIMENG_LOCALES: Record<string, object> = {
  fr: {
    dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
    dayNamesShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    dayNamesMin: ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'],
    monthNames: [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ],
    monthNamesShort: [
      'Jan',
      'Fév',
      'Mar',
      'Avr',
      'Mai',
      'Jun',
      'Jul',
      'Aoû',
      'Sep',
      'Oct',
      'Nov',
      'Déc',
    ],
    today: "Aujourd'hui",
    clear: 'Effacer',
    weekHeader: 'Sem',
  },
  eu: {
    dayNames: [
      'Igandea',
      'Astelehena',
      'Asteartea',
      'Asteazkena',
      'Osteguna',
      'Ostirala',
      'Larunbata',
    ],
    dayNamesShort: ['Iga', 'Aste', 'Aste', 'Aste', 'Ost', 'Ost', 'Lar'],
    dayNamesMin: ['Ig', 'Al', 'Ar', 'Az', 'Og', 'Or', 'La'],
    monthNames: [
      'Urtarrila',
      'Otsaila',
      'Martxoa',
      'Apirila',
      'Maiatza',
      'Ekaina',
      'Uztaila',
      'Abuztua',
      'Iraila',
      'Urria',
      'Azaroa',
      'Abendua',
    ],
    monthNamesShort: [
      'Urt',
      'Ots',
      'Mar',
      'Api',
      'Mai',
      'Eka',
      'Uzt',
      'Abu',
      'Ira',
      'Urr',
      'Aza',
      'Abe',
    ],
    today: 'Gaur',
    clear: 'Garbitu',
    weekHeader: 'Ast',
  },
  en: {
    dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    monthNames: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    monthNamesShort: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    today: 'Today',
    clear: 'Clear',
    weekHeader: 'Wk',
  },
  es: {
    dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    dayNamesMin: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
    monthNames: [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ],
    monthNamesShort: [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ],
    today: 'Hoy',
    clear: 'Limpiar',
    weekHeader: 'Sem',
  },
};

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly primeNG = inject(PrimeNG);
  private readonly translocoService = inject(TranslocoService);

  private readonly activeLang = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  constructor() {
    effect(() => {
      const locale = PRIMENG_LOCALES[this.activeLang()] ?? PRIMENG_LOCALES['fr'];
      this.primeNG.setTranslation(locale);
    });
  }
}
