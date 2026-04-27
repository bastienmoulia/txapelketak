import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { AccordionModule } from 'primeng/accordion';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { Message } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Serie, FinaleGame } from '../../poules/poules';
import { Team } from '../teams/teams';
import { UserRole } from '../../../../home/tournament.interface';
import {
  FinaleGameFormDialog,
  SaveFinaleGameEvent,
} from './finale-game-form-dialog/finale-game-form-dialog';

export type { SaveFinaleGameEvent };

export interface SetFinaleSizeEvent {
  serieRef: DocumentReference;
  size: number;
}

export interface GenerateFinaleEvent {
  serieRef: DocumentReference;
  serieName: string;
  finaleSize: number;
}

export interface DeleteFinaleGamesEvent {
  serieRef: DocumentReference;
}

export interface BracketRound {
  round: string;
  roundOrder: number;
  games: FinaleGame[];
}

@Component({
  selector: 'app-finale-tab',
  imports: [
    AccordionModule,
    FormsModule,
    Select,
    Button,
    Message,
    ConfirmDialogModule,
    TranslocoPipe,
    ApplyPipe,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './finale-tab.html',
  styleUrl: './finale-tab.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinaleTab {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);

  series = input.required<Serie[]>();
  teams = input.required<Team[]>();
  role = input<UserRole | ''>('');

  setFinaleSize = output<SetFinaleSizeEvent>();
  generateFinale = output<GenerateFinaleEvent>();
  deleteFinaleGames = output<DeleteFinaleGamesEvent>();
  saveFinaleGame = output<SaveFinaleGameEvent>();

  sizeOptions = [2, 4, 8, 16, 32].map((v) => ({ label: String(v), value: v }));

  getBracketRounds = (serie: Serie): BracketRound[] => {
    const games = serie.finaleGames ?? [];
    const roundMap = new Map<string, BracketRound>();
    for (const game of games) {
      if (!roundMap.has(game.round)) {
        roundMap.set(game.round, { round: game.round, roundOrder: game.roundOrder, games: [] });
      }
      roundMap.get(game.round)!.games.push(game);
    }
    return [...roundMap.values()]
      .sort((a, b) => b.roundOrder - a.roundOrder)
      .map((r) => ({ ...r, games: r.games.sort((a, b) => a.matchNumber - b.matchNumber) }));
  };

  getTeamName = (ref: DocumentReference | null | undefined, placeholder?: string): string => {
    if (ref) {
      const team = this.teams().find((t) => t.ref.id === ref.id);
      if (team) return team.name;
    }
    if (placeholder) {
      // Structured placeholder: "finale.winnerOf:{roundKey}:{matchNumber}"
      if (placeholder.startsWith('finale.winnerOf:')) {
        const parts = placeholder.split(':');
        const roundKey = parts[1];
        const matchNum = parts[2];
        const roundLabel = this.translocoService.translate(roundKey);
        return this.translocoService.translate('finale.winnerOf', {
          round: roundLabel,
          match: matchNum,
        });
      }
      return placeholder;
    }
    return this.translocoService.translate('finale.noTeam');
  };

  onSetFinaleSize(serie: Serie, size: number | null): void {
    if (size == null) return;
    this.setFinaleSize.emit({ serieRef: serie.ref, size });
  }

  onGenerateFinale(serie: Serie): void {
    if (!serie.finaleSize) return;
    if (serie.finaleGames && serie.finaleGames.length > 0) {
      this.confirmationService.confirm({
        message: this.translocoService.translate('finale.regenerateConfirm'),
        header: this.translocoService.translate('shared.confirm.deleteHeader'),
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.generateFinale.emit({
            serieRef: serie.ref,
            serieName: serie.name,
            finaleSize: serie.finaleSize!,
          });
        },
      });
    } else {
      this.generateFinale.emit({
        serieRef: serie.ref,
        serieName: serie.name,
        finaleSize: serie.finaleSize,
      });
    }
  }

  onDeleteFinaleGames(serie: Serie): void {
    this.confirmationService.confirm({
      message: this.translocoService.translate('finale.deleteConfirm'),
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteFinaleGames.emit({ serieRef: serie.ref });
      },
    });
  }

  onEditFinaleGame(game: FinaleGame, _serie: Serie): void {
    const ref = this.dialogService.open(FinaleGameFormDialog, {
      header: this.translocoService.translate('finale.dialogEditGame'),
      data: {
        teams: this.teams(),
        role: this.role(),
        isEditing: true,
        gameRef: game.ref,
        initialTeam1Ref: game.refTeam1 ?? null,
        initialTeam2Ref: game.refTeam2 ?? null,
        initialScoreTeam1: game.scoreTeam1 ?? null,
        initialScoreTeam2: game.scoreTeam2 ?? null,
        team1Placeholder: game.team1Placeholder,
        team2Placeholder: game.team2Placeholder,
      },
      width: '500px',
    });
    ref.onClose.subscribe((result: SaveFinaleGameEvent | undefined) => {
      if (result) {
        this.saveFinaleGame.emit(result);
      }
    });
  }
}
