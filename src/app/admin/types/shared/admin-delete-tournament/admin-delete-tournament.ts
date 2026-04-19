import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogService } from 'primeng/dynamicdialog';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { Tournament } from '../../../../home/tournament.interface';
import { DeleteTournamentDialog } from './delete-tournament-dialog/delete-tournament-dialog';

@Component({
  selector: 'app-admin-delete-tournament',
  imports: [ButtonModule, ToastModule, TranslocoModule],
  providers: [DialogService, MessageService],
  templateUrl: './admin-delete-tournament.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDeleteTournament {
  private readonly firebaseService = inject(FirebaseService);
  private readonly messageService = inject(MessageService);
  private readonly translocoService = inject(TranslocoService);
  private readonly dialogService = inject(DialogService);
  private readonly router = inject(Router);

  tournament = input.required<Tournament>();

  isDeleting = signal(false);

  onDelete(): void {
    const dialogRef = this.dialogService.open(DeleteTournamentDialog, {
      header: this.translocoService.translate('admin.deleteTournament.dialogTitle'),
      modal: true,
      closable: true,
      width: 'min(32rem, 100%)',
      data: {
        tournamentName: this.tournament().name,
      },
    });

    dialogRef?.onClose.subscribe((confirmed: boolean | undefined) => {
      if (confirmed) {
        void this.deleteTournament();
      }
    });
  }

  private async deleteTournament(): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.firebaseService.deleteTournament(tournamentRef);
      await this.router.navigate(['/']);
    } catch (error) {
      console.error('Failed to delete tournament', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translocoService.translate('admin.deleteTournament.errorTitle'),
        detail: this.translocoService.translate('admin.deleteTournament.errorDetail'),
      });
      this.isDeleting.set(false);
    }
  }
}
