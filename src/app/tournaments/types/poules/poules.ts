import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../../home/tournament.interface';

@Component({
  selector: 'app-poules',
  imports: [],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  tournamentData = input.required<any>();
}
