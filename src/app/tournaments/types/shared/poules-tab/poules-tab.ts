import { Component, computed, inject, input, output, signal } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { UserRole } from '../../../../home/tournament.interface';
import { TooltipModule } from 'primeng/tooltip';

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
    DialogModule,
    InputTextModule,
    FloatLabel,
    MultiSelectModule,
    FormsModule,
    TooltipModule,
  ],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  private translocoService = inject(TranslocoService);

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

  // Serie dialog state
  serieDialogVisible = signal(false);
  isEditingSerie = signal(false);
  serieName = signal('');
  editingSerie = signal<Serie | null>(null);

  // Poule dialog state
  pouleDialogVisible = signal(false);
  isEditingPoule = signal(false);
  pouleName = signal('');
  editingPoule = signal<Poule | null>(null);
  pouleParentSerieRef = signal<DocumentReference | null>(null);

  // Team in poule dialog state
  teamPouleDialogVisible = signal(false);
  teamPouleTarget = signal<Poule | null>(null);
  selectedTeamRefs = signal<DocumentReference[]>([]);
  readonly emptyPoule: Poule = { ref: null!, name: '', refTeams: [] };

  // Delete confirmation dialog state
  deleteConfirmVisible = signal(false);
  deleteConfirmName = signal('');
  private pendingDeleteAction: (() => void) | null = null;

  getTeamName(ref: DocumentReference, teams: Team[]): string {
    if (!ref) {
      return 'Unknown Team';
    }
    const team = teams.find((t) => t.ref.id === ref.id);
    return team ? team.name : 'Unknown Team';
  }

  getAvailableTeams = (poule: Poule, teams: Team[]): Team[] => {
    return teams
      .filter((t) => !poule.refTeams?.some((ref) => ref.id === t.ref.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

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
    this.isEditingSerie.set(false);
    this.serieName.set('');
    this.editingSerie.set(null);
    this.serieDialogVisible.set(true);
  }

  onEditSerie(serie: Serie): void {
    this.isEditingSerie.set(true);
    this.serieName.set(serie.name);
    this.editingSerie.set(serie);
    this.serieDialogVisible.set(true);
  }

  onSaveSerie(): void {
    const name = this.serieName().trim();
    if (!name) return;
    const editing = this.editingSerie();
    this.saveSerie.emit({ name, ref: editing?.ref });
    this.serieDialogVisible.set(false);
  }

  onDeleteSerie(serie: Serie): void {
    this.deleteConfirmName.set(serie.name);
    this.pendingDeleteAction = () => this.deleteSerie.emit(serie);
    this.deleteConfirmVisible.set(true);
  }

  onAddPoule(serieRef: DocumentReference): void {
    this.isEditingPoule.set(false);
    this.pouleName.set('');
    this.editingPoule.set(null);
    this.pouleParentSerieRef.set(serieRef);
    this.pouleDialogVisible.set(true);
  }

  onEditPoule(serieRef: DocumentReference, poule: Poule): void {
    this.isEditingPoule.set(true);
    this.pouleName.set(poule.name);
    this.editingPoule.set(poule);
    this.pouleParentSerieRef.set(serieRef);
    this.pouleDialogVisible.set(true);
  }

  onSavePoule(): void {
    const name = this.pouleName().trim();
    const serieRef = this.pouleParentSerieRef();
    if (!name || !serieRef) return;
    const editing = this.editingPoule();
    this.savePoule.emit({ serieRef, name, ref: editing?.ref });
    this.pouleDialogVisible.set(false);
  }

  onDeletePoule(serieRef: DocumentReference, poule: Poule): void {
    this.deleteConfirmName.set(poule.name);
    this.pendingDeleteAction = () => this.deletePoule.emit({ serieRef, poule });
    this.deleteConfirmVisible.set(true);
  }

  onAddTeamToPoule(poule: Poule): void {
    this.teamPouleTarget.set(poule);
    this.selectedTeamRefs.set([]);
    this.teamPouleDialogVisible.set(true);
  }

  onSaveTeamToPoule(): void {
    const poule = this.teamPouleTarget();
    const teamRefs = this.selectedTeamRefs();
    if (!poule || teamRefs.length === 0) return;

    for (const teamRef of teamRefs) {
      this.addTeamToPoule.emit({ poule, teamRef });
    }

    this.teamPouleDialogVisible.set(false);
  }

  onRemoveTeamFromPoule(poule: Poule, teamRef: DocumentReference): void {
    const teamName = this.getTeamName(teamRef, this.teams());
    this.deleteConfirmName.set(teamName);
    this.pendingDeleteAction = () => this.removeTeamFromPoule.emit({ poule, teamRef });
    this.deleteConfirmVisible.set(true);
  }

  onConfirmDelete(): void {
    this.pendingDeleteAction?.();
    this.pendingDeleteAction = null;
    this.deleteConfirmVisible.set(false);
  }

  onCancelDelete(): void {
    this.pendingDeleteAction = null;
    this.deleteConfirmVisible.set(false);
  }
}
