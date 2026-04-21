import { Component, computed, inject, input, output } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { Team } from '../teams/teams';
import { Poule, Serie } from '../../poules/poules';
import { NgTemplateOutlet } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { UserRole } from '../../../../home/tournament.interface';
import { TooltipModule } from 'primeng/tooltip';
import { SerieFormDialog } from './serie-form-dialog/serie-form-dialog';
import { PouleFormDialog } from './poule-form-dialog/poule-form-dialog';
import { TeamPouleDialog } from './team-poule-dialog/team-poule-dialog';

export interface SaveSerieEvent {
  name: string;
  ref?: DocumentReference;
}

export interface SavePouleEvent {
  serieRef: DocumentReference;
  name: string;
  ref?: DocumentReference;
}

export interface DeletePouleEvent {
  serieRef: DocumentReference;
  poule: Poule;
}

export interface TeamInPouleEvent {
  poule: Poule;
  teamRef: DocumentReference;
}

export interface TeamStanding {
  ref: DocumentReference;
  name: string;
  played: number;
  won: number;
  pointsInLosses: number;
  pointsConceded: number;
}

@Component({
  selector: 'app-poules-tab',
  imports: [
    AccordionModule,
    CardModule,
    NgTemplateOutlet,
    ApplyPipe,
    Button,
    TranslocoPipe,
    Message,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);

  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  role = input<UserRole | ''>('');

  saveSerie = output<SaveSerieEvent>();
  deleteSerie = output<Serie>();
  savePoule = output<SavePouleEvent>();
  deletePoule = output<DeletePouleEvent>();
  addTeamToPoule = output<TeamInPouleEvent>();
  removeTeamFromPoule = output<TeamInPouleEvent>();

  sortedSeries = computed(() =>
    [...this.series()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((poule) => ({
            ...poule,
            standings: this.computeStandings(poule),
          })),
      })),
  );

  defaultOpenSeriesIds = computed(() => {
    const firstSerie = this.sortedSeries()[0];
    return firstSerie && this.sortedSeries().length === 1 ? [firstSerie.ref.id] : [];
  });

  private computeStandings(poule: Poule): TeamStanding[] {
    const teams = this.teams();
    const standings: TeamStanding[] = (poule.refTeams ?? []).map((ref) => {
      const team = teams.find((t) => t.ref.id === ref.id);
      const name = team?.name ?? 'Unknown Team';
      let played = 0;
      let won = 0;
      let pointsInLosses = 0;
      let pointsConceded = 0;

      for (const game of poule.games ?? []) {
        const isTeam1 = game.refTeam1.id === ref.id;
        const isTeam2 = game.refTeam2.id === ref.id;
        const gameFinished =
          game.scoreTeam1 !== undefined &&
          game.scoreTeam1 !== null &&
          game.scoreTeam2 !== undefined &&
          game.scoreTeam2 !== null;

        if ((isTeam1 || isTeam2) && gameFinished) {
          played++;
          const myScore = isTeam1 ? game.scoreTeam1! : game.scoreTeam2!;
          const oppScore = isTeam1 ? game.scoreTeam2! : game.scoreTeam1!;

          if (myScore > oppScore) {
            won++;
          } else if (myScore < oppScore) {
            pointsInLosses += myScore;
          }
          pointsConceded += oppScore;
        }
      }

      return { ref, name, played, won, pointsInLosses, pointsConceded };
    });

    return standings.sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      if (b.pointsInLosses !== a.pointsInLosses) return b.pointsInLosses - a.pointsInLosses;
      return a.pointsConceded - b.pointsConceded;
    });
  }

  getTeamName(ref: DocumentReference, teams: Team[]): string {
    if (!ref) {
      return 'Unknown Team';
    }
    const team = teams.find((t) => t.ref.id === ref.id);
    return team ? team.name : 'Unknown Team';
  }

  getExpectedGamesCount = (poule: Poule): number => {
    const teamCount = poule.refTeams?.length ?? 0;
    return (teamCount * (teamCount - 1)) / 2;
  };

  getCoveredGamesCount = (poule: Poule): number => {
    const currentTeamIds = new Set((poule.refTeams ?? []).map((refTeam) => refTeam.id));
    const pairs = new Set<string>();

    for (const game of poule.games ?? []) {
      const team1Id = game.refTeam1?.id;
      const team2Id = game.refTeam2?.id;

      if (
        !team1Id ||
        !team2Id ||
        team1Id === team2Id ||
        !currentTeamIds.has(team1Id) ||
        !currentTeamIds.has(team2Id)
      ) {
        continue;
      }

      pairs.add(this.getPairKey(team1Id, team2Id));
    }

    return pairs.size;
  };

  getMissingGamesTooltip = (poule: Poule): string => {
    return this.getMissingMatchups(poule).join('\n');
  };

  private getMissingMatchups(poule: Poule): string[] {
    const refTeams = poule.refTeams ?? [];
    if (refTeams.length < 2) {
      return [];
    }

    const teamNameById = new Map(this.teams().map((team) => [team.ref.id, team.name]));
    const existingPairs = new Set<string>();

    for (const game of poule.games ?? []) {
      const team1Id = game.refTeam1?.id;
      const team2Id = game.refTeam2?.id;
      if (!team1Id || !team2Id || team1Id === team2Id) {
        continue;
      }
      existingPairs.add(this.getPairKey(team1Id, team2Id));
    }

    const missing: string[] = [];
    for (let i = 0; i < refTeams.length; i++) {
      for (let j = i + 1; j < refTeams.length; j++) {
        const team1Id = refTeams[i]?.id;
        const team2Id = refTeams[j]?.id;
        if (!team1Id || !team2Id) {
          continue;
        }

        const pairKey = this.getPairKey(team1Id, team2Id);
        if (!existingPairs.has(pairKey)) {
          const team1Name =
            teamNameById.get(team1Id) ??
            this.translocoService.translate('admin.poules.unknownTeam');
          const team2Name =
            teamNameById.get(team2Id) ??
            this.translocoService.translate('admin.poules.unknownTeam');
          missing.push(
            this.translocoService.translate('admin.poules.missingMatchupFormat', {
              team1: team1Name,
              team2: team2Name,
            }),
          );
        }
      }
    }

    return missing.sort((a, b) => a.localeCompare(b));
  }

  private getPairKey(team1Id: string, team2Id: string): string {
    return team1Id < team2Id ? `${team1Id}__${team2Id}` : `${team2Id}__${team1Id}`;
  }

  hasCompleteRoundRobin = (poule: Poule): boolean => {
    return this.getCoveredGamesCount(poule) >= this.getExpectedGamesCount(poule);
  };

  onAddSerie(): void {
    const dialogRef = this.dialogService.open(SerieFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddSerie'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { isEditing: false, serieName: '', editingSerie: null },
    });
    dialogRef?.onClose.subscribe(
      (result: { name: string; ref?: DocumentReference } | undefined) => {
        if (result) {
          this.saveSerie.emit(result);
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
      data: { isEditing: true, serieName: serie.name, editingSerie: serie },
    });
    dialogRef?.onClose.subscribe(
      (result: { name: string; ref?: DocumentReference } | undefined) => {
        if (result) {
          this.saveSerie.emit(result);
        }
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
        this.deleteSerie.emit(serie);
      },
    });
  }

  onAddPoule(serieRef: DocumentReference): void {
    const dialogRef = this.dialogService.open(PouleFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddPoule'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { isEditing: false, pouleName: '', editingPoule: null, serieRef },
    });
    dialogRef?.onClose.subscribe(
      (
        result: { serieRef: DocumentReference; name: string; ref?: DocumentReference } | undefined,
      ) => {
        if (result) {
          this.savePoule.emit(result);
        }
      },
    );
  }

  onEditPoule(serieRef: DocumentReference, poule: Poule): void {
    const dialogRef = this.dialogService.open(PouleFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogEditPoule'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { isEditing: true, pouleName: poule.name, editingPoule: poule, serieRef },
    });
    dialogRef?.onClose.subscribe(
      (
        result: { serieRef: DocumentReference; name: string; ref?: DocumentReference } | undefined,
      ) => {
        if (result) {
          this.savePoule.emit(result);
        }
      },
    );
  }

  onDeletePoule(serieRef: DocumentReference, poule: Poule): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', {
        name: poule.name,
      }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.deletePoule.emit({ serieRef, poule });
      },
    });
  }

  onAddTeamToPoule(poule: Poule): void {
    const dialogRef = this.dialogService.open(TeamPouleDialog, {
      header: this.translocoService.translate('admin.poules.dialogAddTeam'),
      modal: true,
      closable: true,
      width: 'min(30rem, 100%)',
      data: { poule, teams: this.teams() },
    });
    dialogRef?.onClose.subscribe((result: DocumentReference[] | undefined) => {
      if (result && result.length > 0) {
        for (const teamRef of result) {
          this.addTeamToPoule.emit({ poule, teamRef });
        }
      }
    });
  }

  onRemoveTeamFromPoule(poule: Poule, teamRef: DocumentReference): void {
    const teamName = this.getTeamName(teamRef, this.teams());
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('shared.confirm.deleteMessage', { name: teamName }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.removeTeamFromPoule.emit({ poule, teamRef });
      },
    });
  }
}
