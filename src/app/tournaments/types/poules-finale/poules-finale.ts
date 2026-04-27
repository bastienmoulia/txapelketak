import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../../home/tournament.interface';
import { Poules } from '../poules/poules';

@Component({
  selector: 'app-poules-finale',
  imports: [Poules],
  templateUrl: './poules-finale.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoulesFinale {
  tournament = input.required<Tournament>();
}
