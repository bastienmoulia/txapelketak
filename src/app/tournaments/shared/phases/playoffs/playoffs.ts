import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';

import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { Playoff, Game, Poule } from '../../../models';
import { GameFormDialog } from '../../games/game-form-dialog/game-form-dialog';
import type { SaveGameEvent } from '../../games/games';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  PlayoffEditDialog,
  PlayoffEditDialogResult,
} from '../playoff-edit-dialog/playoff-edit-dialog';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';

interface RoundGroup {
  roundSize: number;
  roundLabel: string;
  matches: Game[];
}

interface PlayoffWithRounds {
  playoff: Playoff;
  rounds: RoundGroup[];
}

interface TreeMatch {
  game: Game;
  slotSpan: number;
  gridRow: number;
}

interface TreeRound {
  roundSize: number;
  roundLabel: string;
  matches: TreeMatch[];
  isFinalRound: boolean;
}

interface PlayoffWithTreeRounds {
  playoff: Playoff;
  rounds: TreeRound[];
}

interface TeamLike {
  ref?: DocumentReference;
  name: string;
}

const createTeamNameLookup =
  (teams: () => TeamLike[], transloco: TranslocoService) =>
  (
    ref: DocumentReference | undefined,
    roundIndex: number,
    matchIndex: number,
    teamSlot: 0 | 1,
    totalRounds: number,
  ): string => {
    const team = ref ? teams().find((currentTeam) => currentTeam.ref?.id === ref.id) : undefined;
    if (team?.name && team.name.trim()) return team.name;
    if (roundIndex > 0) {
      return transloco.translate('playoffs.winnerOfPrevious', {
        round: transloco.translate(`finale.rounds.${2 ** (totalRounds - roundIndex + 1)}`),
        number: matchIndex * 2 + teamSlot + 1,
      });
    }
    return '?';
  };

@Component({
  selector: 'app-phases-playoffs',
  imports: [ApplyPipe, Button, CardModule, TranslocoPipe, TooltipModule, DatePipe],
  templateUrl: './playoffs.html',
  styleUrl: './playoffs.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Playoffs {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);
  private datepickerConfig = inject(DatepickerConfigService);

  playoffs = input.required<Playoff[]>();

  teams = this.poulesStore.teams;
  role = this.authStore.role;
  dateLocale = this.datepickerConfig.activeLanguage;

  getTeamName = createTeamNameLookup(this.teams, this.translocoService);

  sortedPlayoffs = computed((): PlayoffWithRounds[] =>
    [...this.playoffs()].map((playoff) => ({
      playoff,
      rounds: this.getRoundsForPlayoff(playoff),
    })),
  );

  bracketTreePlayoffs = computed((): PlayoffWithTreeRounds[] =>
    this.sortedPlayoffs().map(({ playoff, rounds }) => {
      const treeRounds: TreeRound[] = rounds.map((round, roundIndex) => ({
        roundSize: round.roundSize,
        roundLabel: round.roundLabel,
        matches: round.matches.map((game, matchIndex) => ({
          game,
          slotSpan: 2 ** roundIndex,
          gridRow: matchIndex * 2 ** roundIndex + 1,
        })),
        isFinalRound: roundIndex === rounds.length - 1,
      }));

      return { playoff, rounds: treeRounds };
    }),
  );

  private getRoundsForPlayoff(playoff: Playoff): RoundGroup[] {
    const matches = playoff.games ?? [];
    const grouped = new Map<number, Game[]>();

    for (const match of matches) {
      const roundSize = match.roundSize ?? 0;
      if (!grouped.has(roundSize)) {
        grouped.set(roundSize, []);
      }
      grouped.get(roundSize)!.push(match);
    }

    const result: RoundGroup[] = [];
    for (const [roundSize, roundMatches] of grouped.entries()) {
      result.push({
        roundSize,
        roundLabel: this.getRoundLabel(roundSize),
        matches: roundMatches.sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)),
      });
    }

    return result.sort((a, b) => b.roundSize - a.roundSize);
  }

  private readonly activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  private getRoundLabel(roundSize: number): string {
    const key = `finale.rounds.${roundSize}`;
    this.activeLanguage();
    return this.translocoService.translate(key);
  }

  onEditMatch(game: Game, playoff: Playoff): void {
    if (!game.ref) return;

    const pouleAdapter: Poule = {
      ref: playoff.ref,
      name: playoff.name,
      refTeams: this.teams()
        .map((team) => team.ref)
        .filter((ref): ref is DocumentReference => !!ref),
    };

    const dialogRef = this.dialogService.open(GameFormDialog, {
      header: this.translocoService.translate('admin.games.dialogEditGame'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        teams: this.teams(),
        role: this.role(),
        isEditing: true,
        currentPoule: pouleAdapter,
        initialTeam1Ref: game.refTeam1 ?? null,
        initialTeam2Ref: game.refTeam2 ?? null,
        initialScoreTeam1: game.scoreTeam1 ?? null,
        initialScoreTeam2: game.scoreTeam2 ?? null,
        initialDate: game.date ?? null,
        initialReferees: game.referees ?? null,
        initialComment: game.comment ?? null,
        gameRef: game.ref,
      },
    });

    dialogRef?.onClose.subscribe((result: SaveGameEvent | undefined) => {
      if (result) {
        void this.tournamentActions.saveGame(result);
      }
    });
  }

  onEditPlayoff(playoff: Playoff): void {
    const dialogRef = this.dialogService.open(PlayoffEditDialog, {
      header: this.translocoService.translate('admin.poules.dialogEditPlayoff'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { playoff },
    });

    dialogRef?.onClose.subscribe((result: PlayoffEditDialogResult | undefined) => {
      if (!result) return;

      if ('action' in result) {
        this.onDeletePlayoff(playoff);
        return;
      }

      void this.tournamentActions.savePlayoff(result);
    });
  }

  private onDeletePlayoff(playoff: Playoff): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', {
        name: playoff.name,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.tournamentActions.deletePlayoff(playoff);
      },
    });
  }
}
