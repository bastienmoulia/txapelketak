import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { Message } from 'primeng/message';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule } from 'primeng/popover';
import type { Popover } from 'primeng/popover';
import { DialogService } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';

import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { FreePhase, Poule } from '../../../models';
import { GameFormDialog } from '../../games/game-form-dialog/game-form-dialog';
import type { SaveGameEvent } from '../../games/games';
import {
  FreePhaseFormDialog,
  SaveFreePhaseEvent,
} from '../free-phase-form-dialog/free-phase-form-dialog';
import { DatepickerConfigService } from '../../../../shared/services/datepicker-config.service';

@Component({
  selector: 'app-phases-free-phases',
  imports: [Button, CardModule, TranslocoPipe, Message, TooltipModule, PopoverModule, DatePipe],
  templateUrl: './free-phases.html',
  styleUrl: './free-phases.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreePhases {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);
  private datepickerConfig = inject(DatepickerConfigService);

  freePhases = input.required<FreePhase[]>();
  serieRef = input.required<DocumentReference>();

  teams = this.poulesStore.teams;
  role = this.authStore.role;
  dateLocale = this.datepickerConfig.activeLanguage;
  commentPopover = signal<Popover | null>(null);
  currentCommentText = signal<string>('');

  getTeamName = (ref: DocumentReference | undefined): string => {
    if (!ref) return '?';
    const team = this.teams().find((t) => t.ref?.id === ref.id);
    return team?.name ?? '?';
  };

  onAddGame(freePhase: FreePhase): void {
    const allTeamRefs = this.teams()
      .map((team) => team.ref)
      .filter((ref): ref is DocumentReference => !!ref);

    const phaseAdapter: Poule = {
      ref: freePhase.ref,
      name: freePhase.name,
      refTeams: allTeamRefs,
      games: freePhase.games ?? [],
    };

    const dialogRef = this.dialogService.open(GameFormDialog, {
      header: this.translocoService.translate('admin.games.addGame'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        teams: this.teams(),
        role: this.role(),
        isEditing: false,
        currentPoule: phaseAdapter,
      },
    });

    dialogRef?.onClose.subscribe((result: SaveGameEvent | undefined) => {
      if (result) {
        void this.tournamentActions.saveGame(result);
      }
    });
  }

  onEditGame(game: import('../../../models').Game, freePhase: FreePhase): void {
    if (!game.ref) return;

    const allTeamRefs = this.teams()
      .map((team) => team.ref)
      .filter((ref): ref is DocumentReference => !!ref);

    const phaseAdapter: Poule = {
      ref: freePhase.ref,
      name: freePhase.name,
      refTeams: allTeamRefs,
      games: freePhase.games ?? [],
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
        currentPoule: phaseAdapter,
        initialTeam1Ref: game.refTeam1 ?? null,
        initialTeam2Ref: game.refTeam2 ?? null,
        initialIsBye: game.isBye ?? false,
        initialScoreTeam1: game.scoreTeam1 ?? null,
        initialScoreTeam2: game.scoreTeam2 ?? null,
        initialDate: game.date ?? null,
        initialReferees: game.referees ?? null,
        initialComment: game.comment ?? null,
        gameRef: game.ref,
      },
    });

    dialogRef?.onClose.subscribe((result: SaveGameEvent | { action: 'delete' } | undefined) => {
      if (!result) return;
      if ('action' in result && result.action === 'delete') {
        void this.tournamentActions.deleteGame({ gameRef: game.ref });
        return;
      }
      void this.tournamentActions.saveGame(result as SaveGameEvent);
    });
  }

  onEditFreePhase(freePhase: FreePhase): void {
    const dialogRef = this.dialogService.open(FreePhaseFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogEditFreePhase'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        serieRef: this.serieRef(),
        name: freePhase.name,
        hiddenFromVisitors: freePhase.hiddenFromVisitors,
        ref: freePhase.ref,
      },
    });

    dialogRef?.onClose.subscribe(
      (result: SaveFreePhaseEvent | { action: 'delete' } | undefined) => {
        if (!result) return;
        if ('action' in result && result.action === 'delete') {
          this.onDeleteFreePhase(freePhase);
          return;
        }
        void this.tournamentActions.saveFreePhase(result as SaveFreePhaseEvent);
      },
    );
  }

  onDeleteFreePhase(freePhase: FreePhase): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', {
        name:
          freePhase.name.trim() || this.translocoService.translate('freePhase.defaultName'),
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.tournamentActions.deleteFreePhase(freePhase);
      },
    });
  }

  onShowComment(event: MouseEvent, comment: string, popover: Popover): void {
    this.currentCommentText.set(comment);
    popover.toggle(event);
  }
}
