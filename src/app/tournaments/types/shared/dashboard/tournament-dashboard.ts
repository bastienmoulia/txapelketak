import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { Game, Poule } from '../../poules/poules';
import { MarkdownService } from '../../../../shared/services/markdown.service';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';
import { GameFormDialog } from '../games/game-form-dialog/game-form-dialog';
import { SaveGameEvent } from '../games/games';
import { DocumentReference } from '@angular/fire/firestore';
import { TournamentDetailStore } from '../../../../store/tournament-detail.store';
import { PoulesStore } from '../../../../store/poules.store';
import { AuthStore } from '../../../../store/auth.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';

const MAX_UPCOMING_GAMES = 5;
const MAX_RECENT_GAMES = 5;

export interface UpcomingGame {
  team1Name: string;
  team2Name: string;
  date: Date;
  serieName: string;
  pouleName: string;
  referees: string[];
  gameRef: DocumentReference;
  pouleRef: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
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
  imports: [CardModule, ButtonModule, TranslocoPipe, DatePipe, MessageModule, TooltipModule],
  providers: [DialogService],
  templateUrl: './tournament-dashboard.html',
  styleUrl: './tournament-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDashboard {
  private markdownService = inject(MarkdownService);
  private datepickerConfig = inject(DatepickerConfigService);
  private destroyRef = inject(DestroyRef);
  private dialogService = inject(DialogService);
  private translocoService = inject(TranslocoService);
  private tournamentDetailStore = inject(TournamentDetailStore);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);

  tournament = this.tournamentDetailStore.tournament;
  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  loading = this.poulesStore.loading;
  role = this.authStore.role;

  descriptionEl = viewChild<ElementRef<HTMLElement>>('descriptionEl');

  descriptionExpanded = signal(false);
  descriptionOverflows = signal(false);
  readonly nowMs = signal(Date.now());
  readonly dateLocale = this.datepickerConfig.activeLanguage;

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
              gameRef: game.ref,
              pouleRef: poule.ref,
              refTeam1: game.refTeam1,
              refTeam2: game.refTeam2,
              scoreTeam1: game.scoreTeam1 ?? null,
              scoreTeam2: game.scoreTeam2 ?? null,
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
              gameRef: game.ref,
              pouleRef: poule.ref,
              refTeam1: game.refTeam1,
              refTeam2: game.refTeam2,
              scoreTeam1: game.scoreTeam1 ?? null,
              scoreTeam2: game.scoreTeam2 ?? null,
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

  simultaneousGamesCount = computed(() => {
    const gamesByTime = new Map<string, number>();

    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        for (const game of poule.games ?? []) {
          if (!game.date) continue;
          const date = new Date(game.date);
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          gamesByTime.set(key, (gamesByTime.get(key) ?? 0) + 1);
        }
      }
    }

    let count = 0;
    for (const numGames of gamesByTime.values()) {
      if (numGames > 1) count++;
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

  description = computed(() => this.tournament()?.description ?? '');

  hasDescription = computed(() => this.description().trim().length > 0);

  descriptionHtml = computed(() => this.markdownService.toSafeHtml(this.description()));

  toggleDescription(): void {
    this.descriptionExpanded.update((v) => !v);
  }

  onEditOverdueGame(game: UpcomingGame): void {
    const poule = this.findPouleByRef(game.pouleRef);
    if (!poule) return;

    const dialogRef = this.dialogService.open(GameFormDialog, {
      header: this.translocoService.translate('admin.games.dialogEditGame'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        teams: this.teams(),
        role: this.role(),
        isEditing: true,
        currentPoule: poule,
        initialTeam1Ref: game.refTeam1,
        initialTeam2Ref: game.refTeam2,
        initialScoreTeam1: game.scoreTeam1,
        initialScoreTeam2: game.scoreTeam2,
        initialDate: game.date,
        initialReferees: game.referees,
        gameRef: game.gameRef,
      },
    });
    dialogRef?.onClose.subscribe((result: SaveGameEvent | undefined) => {
      if (result) {
        void this.tournamentActions.saveGame({ ...result, gameRef: game.gameRef });
      }
    });
  }

  private findPouleByRef(pouleRef: DocumentReference): Poule | undefined {
    for (const serie of this.series()) {
      for (const poule of serie.poules ?? []) {
        if (poule.ref?.id === pouleRef?.id) return poule;
      }
    }
    return undefined;
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
