import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageModule } from 'primeng/message';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputMaskModule } from 'primeng/inputmask';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TooltipModule } from 'primeng/tooltip';
import { DocumentReference } from '@angular/fire/firestore';
import { Tournament, UserRole } from '../../../../home/tournament.interface';
import { Team } from '../teams/teams';
import { Game, Serie } from '../../poules/poules';
import { MarkdownService } from '../../../../shared/services/markdown.service';
import { SaveGameEvent } from '../games/games';

const MAX_UPCOMING_GAMES = 5;
const MAX_RECENT_GAMES = 5;

export interface UpcomingGame {
  team1Name: string;
  team2Name: string;
  date: Date;
  serieName: string;
  pouleName: string;
  gameRef: DocumentReference;
  pouleRef: DocumentReference;
  pouleRefTeams: DocumentReference[];
  refTeam1: DocumentReference | null | undefined;
  refTeam2: DocumentReference | null | undefined;
  referees?: string[] | null;
}

export interface RecentGame {
  team1Name: string;
  team2Name: string;
  scoreTeam1: number;
  scoreTeam2: number;
  date: Date | undefined;
  serieName: string;
  pouleName: string;
}

@Component({
  selector: 'app-tournament-dashboard',
  imports: [
    CardModule,
    ButtonModule,
    TranslocoPipe,
    DatePipe,
    MessageModule,
    DialogModule,
    FormsModule,
    FloatLabel,
    Select,
    InputNumberModule,
    InputMaskModule,
    AutoCompleteModule,
    TooltipModule,
  ],
  templateUrl: './tournament-dashboard.html',
  styleUrl: './tournament-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentDashboard {
  private markdownService = inject(MarkdownService);
  private destroyRef = inject(DestroyRef);
  private readonly translocoService = inject(TranslocoService);

  tournament = input.required<Tournament>();
  teams = input<Team[]>([]);
  series = input<Serie[]>([]);
  loading = input(false);
  role = input<UserRole | ''>('');

  saveGame = output<SaveGameEvent>();

  descriptionEl = viewChild<ElementRef<HTMLElement>>('descriptionEl');

  descriptionExpanded = signal(false);
  descriptionOverflows = signal(false);
  readonly nowMs = signal(Date.now());

  // Dialog state
  gameDialogVisible = signal(false);
  isEditingGame = signal(false);
  editingGameRef = signal<DocumentReference | null>(null);
  currentPouleRef = signal<DocumentReference | null>(null);
  currentPouleRefTeams = signal<DocumentReference[]>([]);
  selectedTeam1Ref = signal<DocumentReference | null>(null);
  selectedTeam2Ref = signal<DocumentReference | null>(null);
  scoreTeam1 = signal<number | null>(null);
  scoreTeam2 = signal<number | null>(null);
  gameDate = signal<Date | null>(null);
  gameReferees = signal<string[]>([]);

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  firstDayOfWeek = computed(() => {
    this.activeLanguage();
    return Number(this.translocoService.translate('datepicker.firstDayOfWeek'));
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
  });

  datePickerFormat = computed(() => {
    return this.activeLanguage() === 'en' ? 'mm/dd/yy' : 'dd/mm/yy';
  });

  gameDateString = '';

  get gameDateModel(): Date | string | null {
    return this.gameDate() ?? (this.gameDateString || null);
  }

  set gameDateModel(value: Date | string | null) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      this.gameDate.set(value);
      this.gameDateString = this.formatDateForMask(value);
      return;
    }
    if (typeof value === 'string') {
      this.gameDateString = value;
      if (!value) {
        this.gameDate.set(null);
      }
      return;
    }
    this.clearGameDate();
  }

  dialogTeams = computed(() => {
    const refTeams = this.currentPouleRefTeams();
    return this.teams()
      .filter((t) => refTeams.some((ref) => ref.id === t.ref?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

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
              gameRef: game.ref,
              pouleRef: poule.ref,
              pouleRefTeams: poule.refTeams ?? [],
              refTeam1: game.refTeam1,
              refTeam2: game.refTeam2,
              referees: game.referees,
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
              gameRef: game.ref,
              pouleRef: poule.ref,
              pouleRefTeams: poule.refTeams ?? [],
              refTeam1: game.refTeam1,
              refTeam2: game.refTeam2,
              referees: game.referees,
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

  onEditGame(game: UpcomingGame): void {
    this.isEditingGame.set(true);
    this.editingGameRef.set(game.gameRef);
    this.currentPouleRef.set(game.pouleRef);
    this.currentPouleRefTeams.set(game.pouleRefTeams);
    this.selectedTeam1Ref.set(game.refTeam1 ?? null);
    this.selectedTeam2Ref.set(game.refTeam2 ?? null);
    this.scoreTeam1.set(null);
    this.scoreTeam2.set(null);
    const editDate = game.date ? new Date(game.date) : null;
    this.gameDate.set(editDate);
    this.gameDateString = this.formatDateForMask(editDate);
    this.gameReferees.set(game.referees ? [...game.referees] : []);
    this.gameDialogVisible.set(true);
  }

  onSaveGame(): void {
    const team1Ref = this.selectedTeam1Ref();
    const team2Ref = this.selectedTeam2Ref();
    const pouleRef = this.currentPouleRef();
    if (!team1Ref || !team2Ref || !pouleRef) return;

    this.saveGame.emit({
      pouleRef,
      refTeam1: team1Ref,
      refTeam2: team2Ref,
      scoreTeam1: this.scoreTeam1(),
      scoreTeam2: this.scoreTeam2(),
      date: this.gameDate(),
      referees: this.gameReferees().length > 0 ? this.gameReferees() : null,
      gameRef: this.editingGameRef() ?? undefined,
    });
    this.gameDialogVisible.set(false);
  }

  onDateMaskComplete(): void {
    const value = this.gameDateString;
    const parts = value.split(' ');
    if (parts.length < 2) return;
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length < 3 || timeParts.length < 2) return;
    let day: number, month: number;
    if (this.activeLanguage() === 'en') {
      month = parseInt(dateParts[0]) - 1;
      day = parseInt(dateParts[1]);
    } else {
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]) - 1;
    }
    const year = parseInt(dateParts[2]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const date = new Date(year, month, day, hours, minutes);
    if (!isNaN(date.getTime())) {
      this.gameDate.set(date);
      this.gameDateString = this.formatDateForMask(date);
    }
  }

  clearGameDate(): void {
    this.gameDate.set(null);
    this.gameDateString = '';
  }

  private formatDateForMask(date: Date | null): string {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    if (this.activeLanguage() === 'en') {
      return `${m}/${d}/${y} ${h}:${min}`;
    }
    return `${d}/${m}/${y} ${h}:${min}`;
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
