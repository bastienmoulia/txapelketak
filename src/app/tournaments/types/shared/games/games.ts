import { Component, computed, input } from '@angular/core';
import { Serie } from '../../poules/poules';
import { Team } from '../teams/teams';
import { AccordionModule } from 'primeng/accordion';
import { Message } from 'primeng/message';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-games',
  imports: [AccordionModule, Message, NgTemplateOutlet, TranslocoPipe, Card, DatePipe],
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
            games: [...(poule.games ?? [])].sort((a, b) => {
              const aDate = a.date ? new Date(a.date).getTime() : 0;
              const bDate = b.date ? new Date(b.date).getTime() : 0;
              return aDate - bDate;
            }),
          })),
      })),
  );
}
