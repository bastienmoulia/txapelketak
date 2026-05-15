import { Component, computed, inject, input } from '@angular/core';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DialogService } from 'primeng/dynamicdialog';

import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';
import { Poule } from '../../../poules.model';
import { PouleFormDialog } from '../poule-form-dialog/poule-form-dialog';
import type { SavePouleEvent } from '../phases';

interface TeamStanding {
  ref: DocumentReference;
  name: string;
  played: number;
  won: number;
  pointsInLosses: number;
  pointsConceded: number;
}

interface PouleWithStandings extends Poule {
  standings: TeamStanding[];
}

@Component({
  selector: 'app-phases-poules',
  imports: [ApplyPipe, Button, CardModule, TranslocoPipe, Message, TooltipModule],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
})
export class Poules {
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private poulesStore = inject(PoulesStore);
  private authStore = inject(AuthStore);
  private tournamentActions = inject(TournamentActionsService);

  poules = input.required<Poule[]>();
  serieRef = input.required<DocumentReference>();

  teams = this.poulesStore.teams;
  role = this.authStore.role;

  sortedPoules = computed<PouleWithStandings[]>(() =>
    [...this.poules()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((poule) => ({
        ...poule,
        standings: this.computeStandings(poule),
      })),
  );

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

  onEditPoule(poule: Poule): void {
    const dialogRef = this.dialogService.open(PouleFormDialog, {
      header: this.translocoService.translate('admin.poules.dialogEditPoule'),
      modal: true,
      closable: true,
      width: 'min(50rem, 100%)',
      data: {
        isEditing: true,
        pouleName: poule.name,
        editingPoule: poule,
        serieRef: this.serieRef(),
        teams: this.teams(),
      },
    });
    dialogRef?.onClose.subscribe((result: SavePouleEvent | { action: 'delete' } | undefined) => {
      if (!result) return;
      if ('action' in result && result.action === 'delete') {
        this.onDeletePoule(poule);
        return;
      }

      const saveResult = result as SavePouleEvent;

      void this.tournamentActions.savePoule({
        serieRef: saveResult.serieRef,
        name: saveResult.name,
        ref: saveResult.ref,
      });

      const initialTeamRefs = poule.refTeams ?? [];
      const nextTeamRefs = saveResult.teamRefs ?? initialTeamRefs;
      this.applyPouleTeamChanges(poule, initialTeamRefs, nextTeamRefs);
    });
  }

  private applyPouleTeamChanges(
    poule: Poule,
    initialTeamRefs: DocumentReference[],
    nextTeamRefs: DocumentReference[],
  ): void {
    const initialById = new Map(initialTeamRefs.map((teamRef) => [teamRef.id, teamRef]));
    const nextById = new Map(nextTeamRefs.map((teamRef) => [teamRef.id, teamRef]));

    let addedCount = 0;
    let removedCount = 0;

    void (async () => {
      for (const [teamId, teamRef] of nextById) {
        if (!initialById.has(teamId)) {
          await this.tournamentActions.addTeamToPouleSilent({ poule, teamRef });
          addedCount++;
        }
      }

      for (const [teamId, teamRef] of initialById) {
        if (!nextById.has(teamId)) {
          await this.tournamentActions.removeTeamFromPouleSilent({ poule, teamRef });
          removedCount++;
        }
      }

      if (addedCount > 0 || removedCount > 0) {
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.teamsUpdated'),
          detail: this.translocoService.translate('admin.poules.teamsUpdatedDetail', {
            added: addedCount,
            removed: removedCount,
          }),
        });
      }
    })();
  }

  onDeletePoule(poule: Poule): void {
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
        void this.tournamentActions.deletePoule({ serieRef: this.serieRef(), poule });
      },
    });
  }
}
