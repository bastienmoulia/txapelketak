import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Game, Poule, Serie, TimeSlot } from '../../poules/poules';
import { Team } from '../teams/teams';
import { Message } from 'primeng/message';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { DocumentReference } from '@angular/fire/firestore';
import { TableModule } from 'primeng/table';
import { Tournament, UserRole } from '../../../../home/tournament.interface';
import { TooltipModule } from 'primeng/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import { GameFormDialog } from './game-form-dialog/game-form-dialog';
import { GamePoulePickerDialog } from './game-poule-picker-dialog/game-poule-picker-dialog';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

export interface SaveGameEvent {
  pouleRef: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
  date?: Date | null;
  referees?: string[] | null;
  gameRef?: DocumentReference;
}

export interface DeleteGameEvent {
  gameRef: DocumentReference;
}

export interface GenerateAllGamesEvent {
  games: SaveGameEvent[];
}

interface SortableGame extends Game {
  team1Name: string;
  team2Name: string;
  gameDateSortValue: number;
}

export interface GameByDate extends SortableGame {
  pouleName: string;
  serieName: string;
  pouleRef: DocumentReference;
  dateKey: string;
}

export interface GamesDateGroup {
  dateKey: string;
  dateSortValue: number;
  games: GameByDate[];
}

export type GamesViewMode = 'by-date';

export const GAMES_TEAM_FILTER_QUERY_PARAM = 'teamId';

/** A free time slot entry to be rendered inline in the games list */
export interface FreeSlotRow {
  type: 'free-slot';
  date: Date;
  dateKey: string;
  slotIndex: number;
}

/** Unified row type used in the combined schedule */
export type ScheduleRow = GameByDate | FreeSlotRow;

@Component({
  selector: 'app-games',
  imports: [
    Message,
    TranslocoPipe,
    DatePipe,
    Button,
    TableModule,
    TooltipModule,
    Select,
    DatePicker,
    FormsModule,
    ConfirmDialogModule,
    ToggleSwitchModule,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './games.html',
  styleUrl: './games.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games {
  private readonly translocoService = inject(TranslocoService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);

  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  tournament = input.required<Tournament>();
  role = input<UserRole | ''>('');
  timeSlots = input<TimeSlot[]>([]);

  saveGame = output<SaveGameEvent>();
  deleteGame = output<DeleteGameEvent>();
  generateAllGames = output<GenerateAllGamesEvent>();

  showOnlyFreeSlots = signal(false);

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  private teamIdFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((params) => params.get(GAMES_TEAM_FILTER_QUERY_PARAM)),
    ),
    { initialValue: null },
  );

  selectedTeamId = computed(() => this.teamIdFromUrl());
  selectedDateFilter = signal<Date | null>(null);

  firstDayOfWeek = computed(() => {
    this.activeLanguage(); // reactive dependency: re-evaluate on lang change
    return Number(this.translocoService.translate('datepicker.firstDayOfWeek'));
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
  });

  datePickerFormat = computed(() => {
    return this.activeLanguage() === 'en' ? 'mm/dd/yy' : 'dd/mm/yy';
  });

  gamesByDate = computed((): GamesDateGroup[] => {
    const dateMap = new Map<string, GameByDate[]>();

    for (const serie of this.series()) {
      for (const poule of serie.poules) {
        for (const game of poule.games ?? []) {
          const sortable = this.toSortableGame(game);
          const dateKey = this.getDateKey(game.date);
          const gameWithContext: GameByDate = {
            ...sortable,
            pouleName: poule.name,
            serieName: serie.name,
            pouleRef: poule.ref,
            dateKey,
          };
          const existing = dateMap.get(dateKey);
          if (existing) {
            existing.push(gameWithContext);
          } else {
            dateMap.set(dateKey, [gameWithContext]);
          }
        }
      }
    }

    return [...dateMap.entries()]
      .map(([dateKey, games]) => ({
        dateKey,
        dateSortValue: dateKey ? new Date(dateKey).getTime() : Infinity,
        games: [...games].sort((a, b) => a.gameDateSortValue - b.gameDateSortValue),
      }))
      .sort((a, b) => a.dateSortValue - b.dateSortValue);
  });

  flatGamesByDate = computed((): GameByDate[] =>
    this.gamesByDate().flatMap((group) => group.games),
  );

  hasPoules = computed(() => this.series().some((serie) => serie.poules.length > 0));

  sortedTeams = computed(() => [...this.teams()].sort((a, b) => a.name.localeCompare(b.name)));

  selectedTeam = computed(() => {
    const teamId = this.selectedTeamId();
    if (!teamId) return null;
    return this.teams().find((t) => t.ref?.id === teamId) ?? null;
  });

  filteredFlatGamesByDate = computed((): GameByDate[] => {
    console.log(
      'filtering games with selectedTeamId=',
      this.selectedTeamId(),
      'and selectedDateFilter=',
      this.selectedDateFilter(),
    );
    const teamId = this.selectedTeamId();
    const selectedDate = this.selectedDateFilter();
    const games = this.flatGamesByDate();
    return games.filter((game) => {
      const matchesTeam = !teamId || game.refTeam1?.id === teamId || game.refTeam2?.id === teamId;
      const matchesDate = !selectedDate || game.dateKey === this.getDateKey(selectedDate);
      return matchesTeam && matchesDate;
    });
  });

  hasActiveFilters = computed(
    () => Boolean(this.selectedTeamId() || this.selectedDateFilter()) || this.showOnlyFreeSlots(),
  );

  hasTimeSlots = computed(() => this.timeSlots().length > 0);

  /**
   * Returns the sorted time slots that are NOT already covered by a scheduled game.
   * A slot is considered "free" if no game has the exact same date (millisecond precision).
   */
  freeSlots = computed((): FreeSlotRow[] => {
    const gameDates = new Set(
      this.flatGamesByDate()
        .filter((g) => g.date)
        .map((g) => g.date!.getTime()),
    );
    return this.timeSlots()
      .filter((ts) => !gameDates.has(ts.date.getTime()))
      .map(
        (ts, i): FreeSlotRow => ({
          type: 'free-slot',
          date: ts.date,
          dateKey: this.getDateKey(ts.date),
          slotIndex: i,
        }),
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  /**
   * Combined list of games + free slots for display.
   * When showOnlyFreeSlots is true only free slot rows are returned (plus the date group headers).
   */
  scheduleRows = computed((): ScheduleRow[] => {
    const showOnlyFree = this.showOnlyFreeSlots();
    const teamId = this.selectedTeamId();
    const selectedDate = this.selectedDateFilter();

    let gameRows: GameByDate[] = this.flatGamesByDate().filter((game) => {
      const matchesTeam = !teamId || game.refTeam1?.id === teamId || game.refTeam2?.id === teamId;
      const matchesDate = !selectedDate || game.dateKey === this.getDateKey(selectedDate);
      return matchesTeam && matchesDate;
    });

    const freeSlotRows: FreeSlotRow[] = this.freeSlots().filter((slot) => {
      const matchesDate = !selectedDate || slot.dateKey === this.getDateKey(selectedDate);
      return matchesDate;
    });

    if (showOnlyFree) {
      return freeSlotRows;
    }

    // Merge and sort by date
    const combined: ScheduleRow[] = [...gameRows, ...freeSlotRows];
    combined.sort((a, b) => {
      const dateA = 'type' in a ? a.date.getTime() : (a.date?.getTime() ?? 0);
      const dateB = 'type' in b ? b.date.getTime() : (b.date?.getTime() ?? 0);
      if (dateA !== dateB) return dateA - dateB;
      // Games before free slots at same time
      if ('type' in a && !('type' in b)) return 1;
      if (!('type' in a) && 'type' in b) return -1;
      return 0;
    });
    return combined;
  });

  byDateColumnCount = computed(() => {
    const hasActions = this.role() === 'admin' || this.role() === 'organizer';
    return hasActions ? 7 : 6;
  });

  // Map of team ref.id → team name for fast lookup in template
  teamNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const team of this.teams()) {
      if (team.ref?.id) map.set(team.ref.id, team.name);
    }
    return map;
  });

  getTeamName(ref: DocumentReference): string {
    if (!ref) return '?';
    return this.teamNameMap().get(ref.id) ?? '?';
  }

  showScrollToTop = signal(false);
  showScrollToToday = computed(() => {
    const todayKey = this.getDateKey(new Date());
    return this.scheduleRows().some((row) => row.dateKey === todayKey);
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showScrollToTop.set(window.scrollY >= window.innerHeight);
  }

  isFreeSlotRow(row: ScheduleRow): row is FreeSlotRow {
    return 'type' in row && row.type === 'free-slot';
  }

  asGameRow(row: ScheduleRow): GameByDate {
    return row as GameByDate;
  }

  asFreeSlotRow(row: ScheduleRow): FreeSlotRow {
    return row as FreeSlotRow;
  }

  private getSortedSeriesForDialog() {
    return [...this.series()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((poule) => ({
            ...poule,
            games: [...(poule.games ?? [])]
              .map((game) => this.toSortableGame(game))
              .sort((a, b) => a.gameDateSortValue - b.gameDateSortValue),
          })),
      }));
  }

  private getDateKey(date: Date | undefined | null): string {
    if (!date) {
      return '';
    }

    const value = new Date(date);
    const year = String(value.getFullYear());
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toSortableGame(game: Game): SortableGame {
    return {
      ...game,
      team1Name: this.getTeamName(game.refTeam1),
      team2Name: this.getTeamName(game.refTeam2),
      gameDateSortValue: game.date ? new Date(game.date).getTime() : 0,
    };
  }

  onTeamSelect(event: { value?: string }): void {
    const teamId = event?.value ?? null;
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [GAMES_TEAM_FILTER_QUERY_PARAM]: teamId ?? null },
      queryParamsHandling: 'merge',
    });
  }

  clearTeamFilter(): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [GAMES_TEAM_FILTER_QUERY_PARAM]: null },
      queryParamsHandling: 'merge',
    });
  }

  onDateFilterChange(date: Date | null): void {
    this.selectedDateFilter.set(date ?? null);
  }

  clearDateFilter(): void {
    console.log('Clearing date filter');
    this.selectedDateFilter.set(null);
  }

  onToggleFreeSlots(value: boolean): void {
    this.showOnlyFreeSlots.set(value);
  }

  onOpenAddGame(): void {
    const series = this.getSortedSeriesForDialog();
    const dialogRef = this.dialogService.open(GamePoulePickerDialog, {
      header: this.translocoService.translate('admin.games.addGame'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { series },
    });
    dialogRef?.onClose.subscribe((poule: Poule | undefined) => {
      if (poule) {
        this.openFormDialog({
          isEditing: false,
          currentPoule: poule,
        });
      }
    });
  }

  onEditGameFromDate(game: GameByDate): void {
    const poule = this.findPouleByRef(game.pouleRef);
    if (poule) {
      this.openFormDialog({
        isEditing: true,
        currentPoule: poule,
        initialTeam1Ref: game.refTeam1,
        initialTeam2Ref: game.refTeam2,
        initialScoreTeam1: game.scoreTeam1,
        initialScoreTeam2: game.scoreTeam2,
        initialDate: game.date,
        initialReferees: game.referees,
        gameRef: game.ref,
      });
    }
  }

  scrollToToday(): void {
    const todayKey = this.getDateKey(new Date());
    const todayRow = document.getElementById(`games-date-${todayKey}`);
    if (!todayRow) {
      return;
    }

    todayRow.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private openFormDialog(data: {
    isEditing: boolean;
    currentPoule: Poule;
    initialTeam1Ref?: DocumentReference | null;
    initialTeam2Ref?: DocumentReference | null;
    initialScoreTeam1?: number | null;
    initialScoreTeam2?: number | null;
    initialDate?: Date | null;
    initialReferees?: string[] | null;
    gameRef?: DocumentReference | null;
  }): void {
    const dialogRef = this.dialogService.open(GameFormDialog, {
      header: data.isEditing
        ? this.translocoService.translate('admin.games.dialogEditGame')
        : this.translocoService.translate('admin.games.addGame'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        teams: this.teams(),
        role: this.role(),
        ...data,
      },
    });
    dialogRef?.onClose.subscribe((result: SaveGameEvent | undefined) => {
      if (result) {
        if (data.isEditing && data.gameRef) {
          result.gameRef = data.gameRef;
        }
        this.saveGame.emit(result);
      }
    });
  }

  onRequestDeleteGame(gameRef: DocumentReference): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('admin.games.deleteConfirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteGame.emit({ gameRef });
      },
    });
  }

  getMissingGamesCount(poule: Poule): number {
    return this.buildGeneratedGames(poule).length;
  }

  onGenerateAllGames(poule: Poule): void {
    const games = this.buildGeneratedGames(poule);
    if (games.length === 0) {
      return;
    }

    this.generateAllGames.emit({ games });
  }

  private buildGeneratedGames(poule: Poule): SaveGameEvent[] {
    const pouleRef = poule.ref;
    const refTeams = poule.refTeams ?? [];
    if (!pouleRef || refTeams.length < 2) {
      return [];
    }

    const existingGameKeys = new Set(
      (poule.games ?? [])
        .map((game) => this.getGameKey(game.refTeam1, game.refTeam2))
        .filter((gameKey): gameKey is string => Boolean(gameKey)),
    );

    const generatedGames: SaveGameEvent[] = [];
    for (let i = 0; i < refTeams.length; i++) {
      for (let j = i + 1; j < refTeams.length; j++) {
        const refTeam1 = refTeams[i];
        const refTeam2 = refTeams[j];
        const gameKey = this.getGameKey(refTeam1, refTeam2);
        if (!gameKey || existingGameKeys.has(gameKey)) {
          continue;
        }
        generatedGames.push({ pouleRef, refTeam1, refTeam2 });
      }
    }

    return generatedGames;
  }

  private getGameKey(
    refTeam1: DocumentReference | null | undefined,
    refTeam2: DocumentReference | null | undefined,
  ): string | null {
    if (!refTeam1?.id || !refTeam2?.id) {
      return null;
    }
    return [refTeam1.id, refTeam2.id].sort().join('|');
  }

  private findPouleByRef(pouleRef: DocumentReference): Poule | undefined {
    for (const serie of this.series()) {
      const poule = serie.poules.find((p) => p.ref?.id === pouleRef?.id);
      if (poule) return poule;
    }
    return undefined;
  }
}
