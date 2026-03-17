import { Component, computed, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Team } from '../teams/teams';
import { Serie } from '../../poules/poules';

@Component({
  selector: 'app-poules-tab',
  imports: [CardModule],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();

  seriesComputed = computed(() => {
    return this.series().map((serie) => ({
      ...serie,
      poules: serie.poules?.map((poule) => ({
        ...poule,
        teams: poule.idTeams.map((id) => this.teams().find((team) => team.id === id)),
      })),
    }));
  });
}
