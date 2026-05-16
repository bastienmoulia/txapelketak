import { Component, computed, effect, inject, signal } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { TabsModule } from 'primeng/tabs';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SerieFormDialog } from './serie-form-dialog/serie-form-dialog';
import { PouleFormDialog } from './poule-form-dialog/poule-form-dialog';
import { PlayoffsFormDialog, SavePlayoffsEvent } from './playoffs-form-dialog/playoffs-form-dialog';
import { Poules } from './poules/poules';

export type { SavePlayoffsEvent };
import { PoulesStore } from '../../../store/poules.store';
import { AuthStore } from '../../../store/auth.store';
import { TournamentActionsService } from '../../../shared/services/tournament-actions.service';
import { Poule, Serie } from '../../poules.model';

export interface SaveSerieEvent {
  name: string;
  ref?: DocumentReference;
}

export interface SavePouleEvent {
  serieRef: DocumentReference;
  name: string;
  ref?: DocumentReference;
  teamRefs?: DocumentReference[];
}

export interface DeletePouleEvent {
  serieRef: DocumentReference;
  poule: Poule;
}

export interface TeamInPouleEvent {
  poule: Poule;
  teamRef: DocumentReference;
}

@Component({
  selector: 'app-phases',
  imports: [
    TabsModule,
    AccordionModule,
    Button,
    TranslocoPipe,
    Message,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
    Poules,
  ],
  providers: [DialogService, ConfirmationService, MessageService],
  templateUrl: './phases.html',
  styleUrl: './phases.css',
})
export class Phases {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);

  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  role = this.authStore.role;

  sortedSeries = computed(() =>
    [...this.series()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules].sort((a, b) => a.name.localeCompare(b.name)),
      })),
  );

  activeSerie = signal('');

  constructor() {
    // Keep current active serie when data refreshes; fallback only when missing.
    effect(() => {
      const series = this.sortedSeries();
      const currentActiveSerie = this.activeSerie();

      if (series.length === 0) {
        if (currentActiveSerie !== '') {
          this.activeSerie.set('');
        }
        return;
      }

      const isCurrentSerieStillPresent = series.some(
        (serie) => serie.ref.id === currentActiveSerie,
      );
      if (!isCurrentSerieStillPresent) {
        this.activeSerie.set(series[0].ref.id);
      }
    });
  }

  onSerieTabChange(event: string | number | undefined): void {
    this.activeSerie.set(event as string);
  }

  onAddSerie(): void {
    const dialogRef = this.dialogService.open(SerieFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddSerie'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { isEditing: false, serieName: '', editingSerie: null },
    });
    dialogRef?.onClose.subscribe(
      async (result: { name: string; ref?: DocumentReference } | undefined) => {
        if (result) {
          const savedSerieRef = await this.tournamentActions.saveSerie(result);
          if (!result.ref && savedSerieRef?.id) {
            this.activeSerie.set(savedSerieRef.id);
          }
        }
      },
    );
  }

  onEditSerie(serie: Serie): void {
    const dialogRef = this.dialogService.open(SerieFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogEditSerie'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: {
        isEditing: true,
        serieName: serie.name,
        editingSerie: serie,
        canDelete: this.sortedSeries().length > 1,
      },
    });
    dialogRef?.onClose.subscribe(
      (result: { name: string; ref?: DocumentReference } | { action: 'delete' } | undefined) => {
        if (!result) return;
        if ('action' in result && result.action === 'delete') {
          this.onDeleteSerie(serie);
          return;
        }
        void this.tournamentActions.saveSerie(result as { name: string; ref?: DocumentReference });
      },
    );
  }

  onDeleteSerie(serie: Serie): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', {
        name: serie.name,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.tournamentActions.deleteSerie(serie);
      },
    });
  }

  onAddPoule(serieRef: DocumentReference): void {
    const dialogRef = this.dialogService.open(PouleFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddPoule'),
      modal: true,
      closable: true,
      width: 'min(50rem, 100%)',
      data: { isEditing: false, pouleName: '', editingPoule: null, serieRef, teams: this.teams() },
    });
    dialogRef?.onClose.subscribe(
      (
        result:
          | {
              serieRef: DocumentReference;
              name: string;
              ref?: DocumentReference;
              teamRefs?: DocumentReference[];
            }
          | undefined,
      ) => {
        if (result) {
          void (async () => {
            const createdPouleRef = await this.tournamentActions.savePoule({
              serieRef: result.serieRef,
              name: result.name,
              ref: result.ref,
            });

            const selectedTeamRefs = result.teamRefs ?? [];
            if (selectedTeamRefs.length === 0) return;

            const createdPoule: Poule = {
              ref: createdPouleRef,
              name: result.name,
              refTeams: [],
            };

            for (const teamRef of selectedTeamRefs) {
              await this.tournamentActions.addTeamToPouleSilent({
                poule: createdPoule,
                teamRef,
              });
            }

            this.messageService.add({
              severity: 'success',
              summary: this.translocoService.translate('admin.poules.dialogAddPoule'),
              detail: this.translocoService.translate('admin.poules.teamsAddedToPouleDetail', {
                count: selectedTeamRefs.length,
                pouleName: result.name,
              }),
            });
          })();
        }
      },
    );
  }

  onAddPlayoffs(serieRef: DocumentReference): void {
    const dialogRef = this.dialogService.open(PlayoffsFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddPlayoffs'),
      modal: true,
      closable: true,
      width: 'min(60rem, 100%)',
      data: { serieRef, teams: this.teams() },
    });
    dialogRef?.onClose.subscribe((result: SavePlayoffsEvent | undefined) => {
      if (result) {
        console.log('Playoffs to save', result);
        //void this.tournamentActions.generatePlayoffs(result);
        this.messageService.add({
          severity: 'info',
          summary: this.translocoService.translate('admin.poules.comingSoon'),
          detail: this.translocoService.translate('admin.poules.addPlayoffsComingSoon'),
        });
      }
    });
  }

  onAddFreePhase(serieRef: DocumentReference): void {
    console.log('Add free phase for serie', serieRef);
    this.messageService.add({
      severity: 'info',
      summary: this.translocoService.translate('admin.poules.comingSoon'),
      detail: this.translocoService.translate('admin.poules.addPlayoffsComingSoon'),
    });
  }
}
