import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface PoulesData {
  teams?: string[];
}

@Component({
  selector: 'app-poules',
  imports: [],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  tournamentData = input.required<PoulesData>();
}
