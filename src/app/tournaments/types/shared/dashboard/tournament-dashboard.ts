import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Tournament, UserRole } from '../../../../home/tournament.interface';
import { Team } from '../teams/teams';
import { Game, Serie } from '../../poules/poules';
import { MarkdownService } from '../../../../shared/services/markdown.service';

const MAX_UPCOMING_GAMES = 5;
const MAX_RECENT_GAMES = 5;

export interface UpcomingGame {
  team1Name: string;
  team2Name: string;
  date: Date;
  serieName: string;
  pouleName: string;
  referees: string[];
}

export interface RecentGame {
  team1Name: string;
  team2Name: string;
  scoreTeam1: number;
  scoreTeam2: number;
  date: Date | undefined;
  serieName: string;
  pouleName: string;
  referees: string[];
}

@Component({
  selector: 'app-tournament-dashboard',
  imports: [CardModule, ButtonModule, TranslocoPipe, DatePipe, MessageModule],
  templateUrl: './tournament-dashboard.html',
  styleUrl: './tournament-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDashboard {
  private markdownService = inject(MarkdownService);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();
  teams = input<Team[]>([]);
  series = input<Serie[]>([]);
  loading = input(false);
  role = input<UserRole | ''>('');

  descriptionEl = viewChild<ElementRef<HTMLElement>>('descriptionEl');

  descriptionExpanded = signal(false);
  descriptionOverflows = signal(false);
  readonly nowMs = signal(Date.now());

  constructor() {
    const staleGamesTickInterval = setInterval(() => {
      this.nowMs.set(Date.now());
    }, 60 * 1000);
    this.destroyRef.onDestroy(() => clearInterval(staleGamesTickInterval));

    afterRenderEffect({
      read: () => {
        this.descriptionHtml();
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

  seriesCount = computed(() => this.series().length);

  poulesCount = computed(() => {
    let count = 0;
    for (const serie of this.series()) {
      count += serie.poules?.length ?? 0;
    }
    return count;
  });

  playedGamesCount = computed(() => {
    let count = 0;
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (game.scoreTeam1 != null && game.scoreTeam2 != null) {
            count++;
          }
        }
      }
    }
    return count;
  });

  totalScoredPoints = computed(() => {
    let total = 0;
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (game.scoreTeam1 != null && game.scoreTeam2 != null) {
            total += game.scoreTeam1 + game.scoreTeam2;
          }
        }
      }
    }
    return total;
  });

  progressPercent = computed(() => {
    const total = this.gamesCount();
    if (total === 0) return 0;
    return Math.round((this.playedGamesCount() / total) * 100);
  });

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
              referees: game.referees ?? [],
            });
          }
        }
      }
    }

    return upcoming
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, MAX_UPCOMING_GAMES);
  });

  overdueGames = computed((): UpcomingGame[] => {
    const now = new Date();
    const teamNameMap = this.buildTeamNameMap();
    const overdue: UpcomingGame[] = [];

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (
            game.date &&
            new Date(game.date) <= now &&
            (game.scoreTeam1 == null || game.scoreTeam2 == null)
          ) {
            overdue.push({
              team1Name: this.getTeamName(game.refTeam1, teamNameMap),
              team2Name: this.getTeamName(game.refTeam2, teamNameMap),
              date: new Date(game.date),
              serieName: serie.name,
              pouleName: poule.name,
              referees: game.referees ?? [],
            });
          }
        }
      }
    }

    return overdue.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  undatedGamesCount = computed(() => {
    let count = 0;
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (!game.date) {
            count++;
          }
        }
      }
    }
    return count;
  });

  staleUnscoredGamesCount = computed(() => {
    const oneHourAgo = this.nowMs() - 60 * 60 * 1000;
    let count = 0;

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (!game.date) continue;
          const gameDateMs = new Date(game.date).getTime();
          const hasNoScore = game.scoreTeam1 == null || game.scoreTeam2 == null;
          if (gameDateMs <= oneHourAgo && hasNoScore) {
            count++;
          }
        }
      }
    }

    return count;
  });

  gamesWithoutRefereesCount = computed(() => {
    const now = this.nowMs();
    const oneWeekAhead = now + 7 * 24 * 60 * 60 * 1000;
    let count = 0;

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (!game.date) continue;
          const gameDateMs = new Date(game.date).getTime();
          const isInNextWeek = gameDateMs >= now && gameDateMs <= oneWeekAhead;
          const hasNoReferees = !game.referees || game.referees.length === 0;

          if (isInNextWeek && hasNoReferees) {
            count++;
          }
        }
      }
    }

    return count;
  });

  showWarnings = computed(() => this.role() === 'admin' || this.role() === 'organizer');

  recentGames = computed((): RecentGame[] => {
    const teamNameMap = this.buildTeamNameMap();
    const recent: RecentGame[] = [];

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (game.scoreTeam1 != null && game.scoreTeam2 != null) {
            recent.push({
              team1Name: this.getTeamName(game.refTeam1, teamNameMap),
              team2Name: this.getTeamName(game.refTeam2, teamNameMap),
              scoreTeam1: game.scoreTeam1,
              scoreTeam2: game.scoreTeam2,
              date: game.date ? new Date(game.date) : undefined,
              serieName: serie.name,
              pouleName: poule.name,
              referees: game.referees ?? [],
            });
          }
        }
      }
    }

    return recent
      .sort((a, b) => {
        if (a.date && b.date) return b.date.getTime() - a.date.getTime();
        if (a.date) return -1;
        if (b.date) return 1;
        return 0;
      })
      .slice(0, MAX_RECENT_GAMES);
  });

  description = computed(() => this.tournament().description ?? '');

  hasDescription = computed(() => this.description().trim().length > 0);

  descriptionHtml = computed(() => this.markdownService.toSafeHtml(this.description()));

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
