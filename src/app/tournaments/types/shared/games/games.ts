import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Game, Poule, Serie } from '../../poules/poules';
import { Team } from '../teams/teams';
import { AccordionModule } from 'primeng/accordion';
import { Message } from 'primeng/message';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputMaskModule } from 'primeng/inputmask';
import { DocumentReference } from '@angular/fire/firestore';
import { TableModule } from 'primeng/table';
import { DatePicker } from 'primeng/datepicker';
import { UserRole } from '../../../../home/tournament.interface';
import { SelectButton } from 'primeng/selectbutton';

export interface SaveGameEvent {
  pouleRef: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
  date?: Date | null;
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
}

export interface GamesDateGroup {
  dateKey: string;
  dateSortValue: number;
  games: GameByDate[];
}

export type GamesViewMode = 'by-pool' | 'by-date';

@Component({
  selector: 'app-games',
  imports: [
    AccordionModule,
    Message,
    NgTemplateOutlet,
    TranslocoPipe,
    Card,
    DatePipe,
    Button,
    DialogModule,
    FormsModule,
    FloatLabel,
    Select,
    InputNumberModule,
    TableModule,
    DatePicker,
    InputMaskModule,
    SelectButton,
  ],
  templateUrl: './games.html',
  styleUrl: './games.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Games {
  private readonly translocoService = inject(TranslocoService);

  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  role = input<UserRole | ''>('');

  saveGame = output<SaveGameEvent>();
  deleteGame = output<DeleteGameEvent>();
  generateAllGames = output<GenerateAllGamesEvent>();

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  firstDayOfWeek = computed(() => {
    this.activeLanguage(); // reactive dependency: re-evaluate on lang change
    return Number(this.translocoService.translate('datepicker.firstDayOfWeek'));
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
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

  sortedSeries = computed(() =>
    [...this.series()]
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
      })),
  );

  gamesByDate = computed((): GamesDateGroup[] => {
    const dateMap = new Map<string, GameByDate[]>();

    for (const serie of this.series()) {
      for (const poule of serie.poules) {
        for (const game of poule.games ?? []) {
          const sortable = this.toSortableGame(game);
          const gameWithContext: GameByDate = {
            ...sortable,
            pouleName: poule.name,
            serieName: serie.name,
            pouleRef: poule.ref,
          };
          const dateKey = game.date
            ? new Date(game.date).toISOString().substring(0, 10)
            : '';
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

  viewMode = signal<GamesViewMode>('by-pool');

  viewOptions = computed(() => [
    { label: this.translocoService.translate('admin.games.viewByPool'), value: 'by-pool' },
    { label: this.translocoService.translate('admin.games.viewByDate'), value: 'by-date' },
  ]);

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

  // Teams available for the current poule dialog
  dialogTeams = computed(() => {
    const refTeams = this.currentPouleRefTeams();
    return this.teams()
      .filter((t) => refTeams.some((ref) => ref.id === t.ref?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Map of team ref.id → team name for fast lookup in template
  teamNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const team of this.teams()) {
      if (team.ref?.id) map.set(team.ref.id, team.name);
    }
    return map;
  });

  // Delete confirmation dialog state
  deleteConfirmVisible = signal(false);
  pendingDeleteGameRef = signal<DocumentReference | null>(null);

  getTeamName(ref: DocumentReference): string {
    if (!ref) return '?';
    return this.teamNameMap().get(ref.id) ?? '?';
  }

  private toSortableGame(game: Game): SortableGame {
    return {
      ...game,
      team1Name: this.getTeamName(game.refTeam1),
      team2Name: this.getTeamName(game.refTeam2),
      gameDateSortValue: game.date ? new Date(game.date).getTime() : 0,
    };
  }

  onAddGame(poule: Poule): void {
    this.isEditingGame.set(false);
    this.editingGameRef.set(null);
    this.currentPouleRef.set(poule.ref);
    this.currentPouleRefTeams.set(poule.refTeams ?? []);
    this.selectedTeam1Ref.set(null);
    this.selectedTeam2Ref.set(null);
    this.scoreTeam1.set(null);
    this.scoreTeam2.set(null);
    this.clearGameDate();
    this.gameDialogVisible.set(true);
  }

  onEditGame(poule: Poule, game: Game): void {
    this.isEditingGame.set(true);
    this.editingGameRef.set(game.ref);
    this.currentPouleRef.set(poule.ref);
    this.currentPouleRefTeams.set(poule.refTeams ?? []);
    this.selectedTeam1Ref.set(game.refTeam1 ?? null);
    this.selectedTeam2Ref.set(game.refTeam2 ?? null);
    this.scoreTeam1.set(game.scoreTeam1 ?? null);
    this.scoreTeam2.set(game.scoreTeam2 ?? null);
    const editDate = game.date ? new Date(game.date) : null;
    this.gameDate.set(editDate);
    this.gameDateString = this.formatDateForMask(editDate);
    this.gameDialogVisible.set(true);
  }

  onEditGameFromDate(game: GameByDate): void {
    const poule = this.findPouleByRef(game.pouleRef);
    if (!poule) return;
    this.onEditGame(poule, game);
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
      gameRef: this.editingGameRef() ?? undefined,
    });
    this.gameDialogVisible.set(false);
  }

  onDeleteGame(gameRef: DocumentReference): void {
    this.pendingDeleteGameRef.set(gameRef);
    this.deleteConfirmVisible.set(true);
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

  onConfirmDelete(): void {
    const gameRef = this.pendingDeleteGameRef();
    if (gameRef) {
      this.deleteGame.emit({ gameRef });
      this.pendingDeleteGameRef.set(null);
    }
    this.deleteConfirmVisible.set(false);
  }

  onCancelDelete(): void {
    this.pendingDeleteGameRef.set(null);
    this.deleteConfirmVisible.set(false);
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
