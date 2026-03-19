import { Component, computed, input } from '@angular/core';
import { Serie } from '../../poules/poules';
import { Team } from '../teams/teams';
import { AccordionModule } from 'primeng/accordion';
import { Message } from 'primeng/message';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-games',
  imports: [AccordionModule, Message, NgTemplateOutlet, TranslocoPipe, Card],
  templateUrl: './games.html',
  styleUrl: './games.css',
})
export class Games {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  admin = input(false);

  sortedSeries = computed(() =>
    [...this.series()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((poule) => ({
            ...poule,
            refTeams: [...(poule.refTeams ?? [])].sort((a, b) => {
              const teams = this.teams();
              const nameA = teams.find((t) => t.ref.id === a.id)?.name ?? '';
              const nameB = teams.find((t) => t.ref.id === b.id)?.name ?? '';
              return nameA.localeCompare(nameB);
            }),
          })),
      })),
  );
}
