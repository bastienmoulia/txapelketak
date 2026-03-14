import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PoulesFinaleData {
  teams?: string[];
}

@Component({
  selector: 'app-poules-finale',
  imports: [],
  templateUrl: './poules-finale.html',
  styleUrl: './poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoulesFinale {
  tournamentData = input.required<PoulesFinaleData>();
}
