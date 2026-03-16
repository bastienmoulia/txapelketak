import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { Team } from '../shared/teams/teams';
import { Teams } from '../shared/teams/teams';

export interface PoulesData {
  teams?: Team[];
  series?: Series[];
}

export interface Series {
  id: string;
  name: string;
  poules: Poule[];
}

export interface Poule {
  id: string;
  name: string;
  idTeams: string[];
}

@Component({
  selector: 'app-poules',
  imports: [TabsModule, Teams, TranslocoModule],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  tournamentData = input.required<PoulesData>();
}
