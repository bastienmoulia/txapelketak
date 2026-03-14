import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface FinaleData {
  teams?: string[];
}

@Component({
  selector: 'app-finale',
  imports: [],
  templateUrl: './finale.html',
  styleUrl: './finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Finale {
  tournamentData = input.required<FinaleData>();
}
