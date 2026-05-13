import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { DialogService } from 'primeng/dynamicdialog';
import { RouterLink } from '@angular/router';
import { PopoverModule } from 'primeng/popover';
import type { Popover } from 'primeng/popover';
import { TeamFormDialog, type DeleteTeamAction } from './team-form-dialog/team-form-dialog';
import { TeamBulkDialog } from './team-bulk-dialog/team-bulk-dialog';
import { DocumentReference } from '@angular/fire/firestore';
import { PoulesStore } from '../../../store/poules.store';
import { AuthStore } from '../../../store/auth.store';
import { TournamentActionsService } from '../../../shared/services/tournament-actions.service';

export interface Team {
  ref: DocumentReference;
  name: string;
  comment?: string;
  serieName?: string;
  pouleName?: string;
}

@Component({
  selector: 'app-teams',
  imports: [
    TableModule,
    TranslocoModule,
    MessageModule,
    ButtonModule,
    ConfirmDialogModule,
    RouterLink,
    TooltipModule,
    IconField,
    InputIcon,
    InputTextModule,
    PopoverModule,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams {
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translocoService = inject(TranslocoService);
  private readonly poulesStore = inject(PoulesStore);
  private readonly authStore = inject(AuthStore);
  private readonly tournamentActions = inject(TournamentActionsService);

  teams = this.poulesStore.teamsWithContext;
  role = this.authStore.role;

  commentPopover = viewChild<Popover>('commentPopover');
  currentCommentText = signal<string>('');

  onAddTeam(): void {
    const dialogRef = this.dialogService.open(TeamFormDialog, {
      header: this.translocoService.translate('admin.teams.dialogAdd'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { isEditing: false, team: { ref: null!, name: '', comment: undefined } },
    });
    dialogRef?.onClose.subscribe((result: Team | undefined) => {
      if (result) {
        void this.tournamentActions.saveTeam(result);
      }
    });
  }

  onAddTeams(): void {
    const dialogRef = this.dialogService.open(TeamBulkDialog, {
      header: this.translocoService.translate('admin.teams.dialogAddBulk'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {},
    });
    dialogRef?.onClose.subscribe((result: Team[] | undefined) => {
      if (result) {
        void this.tournamentActions.saveTeams(result);
      }
    });
  }

  onEditTeam(team: Team): void {
    const dialogRef = this.dialogService.open(TeamFormDialog, {
      header: this.translocoService.translate('admin.teams.dialogEdit'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        isEditing: true,
        team: { ref: team.ref, name: team.name, comment: team.comment ?? '' },
      },
    });
    dialogRef?.onClose.subscribe((result: Team | DeleteTeamAction | undefined) => {
      if (!result) return;
      if ('action' in result && result.action === 'delete') {
        this.onDeleteTeam(team);
        return;
      }
      void this.tournamentActions.saveTeam(result as Team);
    });
  }

  onShowComment(event: MouseEvent, comment: string): void {
    this.currentCommentText.set(comment);
    this.commentPopover()?.toggle(event);
  }

  onDeleteTeam(team: Team): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', { name: team.name }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.tournamentActions.deleteTeam(team);
      },
    });
  }
}
