import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { AccordionModule } from 'primeng/accordion';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FinaleGame, Serie } from '../../poules/poules.model';
import { Team } from '../teams/teams';
import { DocumentReference } from '@angular/fire/firestore';
import { UserRole } from '../../../../home/tournament.interface';
import { ApplyPipe } from 'ngxtension/call-apply';

export interface SaveFinaleGameEvent {
  gameRef: DocumentReference;
  refTeam1?: DocumentReference | null;
  refTeam2?: DocumentReference | null;
  team1Label?: string | null;
  team2Label?: string | null;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
  date?: Date | null;
}

export interface GenerateBracketEvent {
  serieRef: DocumentReference;
  serieName: string;
  finaleSize: number;
}

export interface UpdateFinaleSizeEvent {
  serieRef: DocumentReference;
  finaleSize: number;
}

export interface DeleteBracketEvent {
  serieRef: DocumentReference;
}

export const FINALE_SIZE_OPTIONS = [2, 4, 8, 16, 32] as const;
export type FinaleSize = (typeof FINALE_SIZE_OPTIONS)[number];

@Component({
  selector: 'app-finale-tab',
  imports: [
    AccordionModule,
    Button,
    Select,
    FormsModule,
    ConfirmDialogModule,
    TranslocoPipe,
    ApplyPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './finale-tab.html',
  styleUrl: './finale-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinaleTab {
  private translocoService = inject(TranslocoService);
  private confirmationService = inject(ConfirmationService);

  series = input.required<Serie[]>();
  teams = input.required<Team[]>();
  role = input<UserRole | ''>('');

  saveFinaleGame = output<SaveFinaleGameEvent>();
  generateBracket = output<GenerateBracketEvent>();
  updateFinaleSize = output<UpdateFinaleSizeEvent>();
  deleteBracket = output<DeleteBracketEvent>();

  finaleSizeOptions = FINALE_SIZE_OPTIONS.map((v) => ({ label: String(v), value: v }));

  editingGameId = signal<string | null>(null);
  editScoreTeam1 = signal<number | null>(null);
  editScoreTeam2 = signal<number | null>(null);
  editTeam1Ref = signal<DocumentReference | null>(null);
  editTeam2Ref = signal<DocumentReference | null>(null);

  sortedSeries = computed(() => [...this.series()].sort((a, b) => a.name.localeCompare(b.name)));

  getGamesByPhase = (
    serie: Serie,
  ): { phase: string; phaseOrder: number; games: FinaleGame[] }[] => {
    const games = serie.finaleGames ?? [];
    const phaseMap = new Map<
      string,
      { phase: string; phaseOrder: number; games: FinaleGame[] }
    >();
    for (const game of games) {
      if (!phaseMap.has(game.phase)) {
        phaseMap.set(game.phase, { phase: game.phase, phaseOrder: game.phaseOrder, games: [] });
      }
      phaseMap.get(game.phase)!.games.push(game);
    }
    return [...phaseMap.values()]
      .sort((a, b) => a.phaseOrder - b.phaseOrder)
      .map((p) => ({
        ...p,
        games: [...p.games].sort((a, b) => a.matchNumber - b.matchNumber),
      }));
  };

  getTeamDisplay = (game: FinaleGame, slot: 1 | 2, teams: Team[]): string => {
    const ref = slot === 1 ? game.refTeam1 : game.refTeam2;
    const label = slot === 1 ? game.team1Label : game.team2Label;
    if (ref) {
      const team = teams.find((t) => t.ref.id === ref.id);
      return team ? team.name : this.translocoService.translate('admin.finale.unknownTeam');
    }
    if (label) {
      return label;
    }
    return this.translocoService.translate('admin.finale.toDefine');
  };

  isGameFinished = (game: FinaleGame): boolean => {
    return game.scoreTeam1 != null && game.scoreTeam2 != null;
  };

  getTeamOptions = (teams: Team[]): { label: string; value: DocumentReference | null }[] => {
    return [
      { label: this.translocoService.translate('admin.finale.toDefine'), value: null },
      ...teams.map((t) => ({ label: t.name, value: t.ref })),
    ];
  };

  onFinaleSizeChange(serie: Serie, value: number): void {
    this.updateFinaleSize.emit({ serieRef: serie.ref, finaleSize: value });
  }

  onGenerateBracket(serie: Serie): void {
    const finaleSize = serie.finaleSize;
    if (!finaleSize) return;
    const existingGames = serie.finaleGames ?? [];
    if (existingGames.length > 0) {
      this.confirmationService.confirm({
        header: this.translocoService.translate('admin.finale.confirmRegenerateHeader'),
        message: this.translocoService.translate('admin.finale.confirmRegenerateMessage'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.translocoService.translate('admin.finale.regenerate'),
        rejectLabel: this.translocoService.translate('shared.actions.cancel'),
        acceptButtonStyleClass: 'p-button-warning',
        rejectButtonStyleClass: 'p-button-secondary',
        accept: () => {
          this.generateBracket.emit({ serieRef: serie.ref, serieName: serie.name, finaleSize });
        },
      });
    } else {
      this.generateBracket.emit({ serieRef: serie.ref, serieName: serie.name, finaleSize });
    }
  }

  onDeleteBracket(serie: Serie): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('admin.finale.confirmDeleteMessage'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deleteBracket.emit({ serieRef: serie.ref });
      },
    });
  }

  onEditGame(game: FinaleGame): void {
    this.editingGameId.set(game.ref.id);
    this.editScoreTeam1.set(game.scoreTeam1 ?? null);
    this.editScoreTeam2.set(game.scoreTeam2 ?? null);
    this.editTeam1Ref.set(game.refTeam1 ?? null);
    this.editTeam2Ref.set(game.refTeam2 ?? null);
  }

  onCancelEdit(): void {
    this.editingGameId.set(null);
  }

  onSaveGameScore(game: FinaleGame): void {
    this.saveFinaleGame.emit({
      gameRef: game.ref,
      refTeam1: this.editTeam1Ref(),
      refTeam2: this.editTeam2Ref(),
      team1Label: game.team1Label ?? null,
      team2Label: game.team2Label ?? null,
      scoreTeam1: this.editScoreTeam1(),
      scoreTeam2: this.editScoreTeam2(),
      date: game.date ?? null,
    });
    this.editingGameId.set(null);
  }
}
