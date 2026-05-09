import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { Team } from '../teams/teams';
import { Poule, Serie, FinaleGame } from '../../poules/poules';
import { NgTemplateOutlet } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { SerieFormDialog } from './serie-form-dialog/serie-form-dialog';
import { PouleFormDialog } from './poule-form-dialog/poule-form-dialog';
import { TeamPouleDialog } from './team-poule-dialog/team-poule-dialog';
import {
  FinaleGameFormDialog,
  SaveFinaleGameEvent,
} from './finale-game-form-dialog/finale-game-form-dialog';

export type { SaveFinaleGameEvent };
import { PoulesStore } from '../../../../store/poules.store';
import { AuthStore } from '../../../../store/auth.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';

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

export interface TeamStanding {
  ref: DocumentReference;
  name: string;
  played: number;
  won: number;
  pointsInLosses: number;
  pointsConceded: number;
}

export interface BracketRound {
  round: string;
  roundOrder: number;
  games: FinaleGame[];
}

@Component({
  selector: 'app-poules-tab',
  imports: [
    TabsModule,
    AccordionModule,
    CardModule,
    NgTemplateOutlet,
    ApplyPipe,
    Button,
    TranslocoPipe,
    Message,
    ConfirmDialogModule,
    TooltipModule,
    FormsModule,
    Select,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);

  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  role = this.authStore.role;
  showFinale = input(false);

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

  sizeOptions = [2, 4, 8, 16, 32].map((v) => ({ label: String(v), value: v }));

  onSerieTabChange(event: string | number | undefined): void {
    // PrimeNG tabs passes the value directly in the event
    this.activeSerie.set(event as string);
  }

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
      data: { isEditing: true, serieName: serie.name, editingSerie: serie },
    });
    dialogRef?.onClose.subscribe(
      (result: { name: string; ref?: DocumentReference } | undefined) => {
        if (result) {
          void this.tournamentActions.saveSerie(result);
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
        void this.tournamentActions.deleteSerie(serie);
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
          void this.tournamentActions.savePoule(result);
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
          void this.tournamentActions.savePoule(result);
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
        void this.tournamentActions.deletePoule({ serieRef, poule });
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
          void this.tournamentActions.addTeamToPoule({ poule, teamRef });
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
        void this.tournamentActions.removeTeamFromPoule({ poule, teamRef });
      },
    });
  }

  // Finale methods
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

  getTeamNameForFinale = (
    ref: DocumentReference | null | undefined,
    placeholder?: string,
  ): string => {
    if (ref) {
      const team = this.teams().find((t) => t.ref.id === ref.id);
      if (team) return team.name;
    }
    if (placeholder) {
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
    void this.tournamentActions.setFinaleSize({ serieRef: serie.ref, size });
  }

  onGenerateFinale(serie: Serie): void {
    if (!serie.finaleSize) return;
    if (serie.finaleGames && serie.finaleGames.length > 0) {
      this.confirmationService.confirm({
        message: this.translocoService.translate('finale.regenerateConfirm'),
        header: this.translocoService.translate('shared.confirm.deleteHeader'),
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          void this.tournamentActions.generateFinale({
            serieRef: serie.ref,
            serieName: serie.name,
            finaleSize: serie.finaleSize!,
          });
        },
      });
    } else {
      void this.tournamentActions.generateFinale({
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
        void this.tournamentActions.deleteFinaleGames({ serieRef: serie.ref });
      },
    });
  }

  onEditFinaleGame(game: FinaleGame): void {
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
    ref?.onClose.subscribe((result: SaveFinaleGameEvent | undefined) => {
      if (result) {
        void this.tournamentActions.saveFinaleGame(result);
      }
    });
  }
}
