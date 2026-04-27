import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tournament } from '../../home/tournament.interface';
import { Finale } from './finale/finale';
import { Poules } from './poules/poules';
import { PoulesFinale } from './poules-finale/poules-finale';

@Component({
  selector: 'app-types',
  imports: [Finale, Poules, PoulesFinale, TranslocoModule],
  templateUrl: './types.html',
  styleUrl: './types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Types {
  tournament = input.required<Tournament>();
}
