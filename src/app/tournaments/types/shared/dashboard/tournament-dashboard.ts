import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { Tournament } from '../../../../home/tournament.interface';
import { TournamentStatusLabelPipe } from '../../../../shared/pipes/tournament-status-label.pipe';
import { TournamentStatusSeverityPipe } from '../../../../shared/pipes/tournament-status-severity.pipe';
import { Team } from '../teams/teams';
import { Game, Serie } from '../../poules/poules';

const MAX_UPCOMING_GAMES = 5;

export interface UpcomingGame {
  team1Name: string;
  team2Name: string;
  date: Date;
  serieName: string;
  pouleName: string;
}

@Component({
  selector: 'app-tournament-dashboard',
  imports: [
    CardModule,
    TagModule,
    ButtonModule,
    TranslocoPipe,
    TournamentStatusLabelPipe,
    TournamentStatusSeverityPipe,
    DatePipe,
  ],
  templateUrl: './tournament-dashboard.html',
  styleUrl: './tournament-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDashboard {
  tournament = input.required<Tournament>();
  teams = input<Team[]>([]);
  series = input<Serie[]>([]);

  descriptionEl = viewChild<ElementRef<HTMLElement>>('descriptionEl');

  descriptionExpanded = signal(false);
  descriptionOverflows = signal(false);

  constructor() {
    afterRenderEffect({
      read: () => {
        this.description();
        const el = this.descriptionEl()?.nativeElement;
        if (el && !this.descriptionExpanded()) {
          const originalDisplay = el.style.display;
          el.style.display = 'block';
          const naturalHeight = el.scrollHeight;
          el.style.display = originalDisplay;

          this.descriptionOverflows.set(naturalHeight > 6 * 16); // 6rem in px
        }
      },
    });
  }

  teamsCount = computed(() => this.teams().length);

  gamesCount = computed(() => {
    let count = 0;
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        count += poule.games?.length ?? 0;
      }
    }
    return count;
  });

  upcomingGames = computed((): UpcomingGame[] => {
    const now = new Date();
    const teamNameMap = this.buildTeamNameMap();
    const upcoming: UpcomingGame[] = [];

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (game.date && new Date(game.date) > now) {
            upcoming.push({
              team1Name: this.getTeamName(game.refTeam1, teamNameMap),
              team2Name: this.getTeamName(game.refTeam2, teamNameMap),
              date: new Date(game.date),
              serieName: serie.name,
              pouleName: poule.name,
            });
          }
        }
      }
    }

    return upcoming
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, MAX_UPCOMING_GAMES);
  });

  description = computed(() => this.tournament().description ?? '');

  toggleDescription(): void {
    this.descriptionExpanded.update((v) => !v);
  }

  private buildTeamNameMap(): Map<string, string> {
    const map = new Map<string, string>();
    for (const team of this.teams()) {
      if (team.ref?.id) map.set(team.ref.id, team.name);
    }
    return map;
  }

  private getTeamName(
    ref: Game['refTeam1'] | Game['refTeam2'] | undefined,
    map: Map<string, string>,
  ): string {
    if (!ref?.id) return '?';
    return map.get(ref.id) ?? '?';
  }
}
