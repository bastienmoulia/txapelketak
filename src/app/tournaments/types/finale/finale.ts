import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../../home/tournament.interface';

@Component({
  selector: 'app-finale',
  imports: [],
  templateUrl: './finale.html',
  styleUrl: './finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Finale {
  tournamentData = input.required<any>();
}
