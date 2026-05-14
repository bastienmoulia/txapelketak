import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { MultiSelectModule } from 'primeng/multiselect';
import { TooltipModule } from 'primeng/tooltip';
import { OrderListModule } from 'primeng/orderlist';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import type { Team } from '../../teams/teams';
import { KeyValue } from '@angular/common';

export interface SavePlayoffsEvent {
  serieRef: DocumentReference;
  name: string;
  orderedTeamRefs: DocumentReference[];
  size: number;
}

interface PlayoffsFormDialogData {
  serieRef: DocumentReference;
  teams: Team[];
}

export interface BracketPreviewMatch {
  matchNumber: number;
  team1Name: string;
  team2Name: string;
  isBye: boolean;
}

export interface BracketPreviewRound {
  roundLabel: string;
  roundOrder: number;
  matches: BracketPreviewMatch[];
}

function nextPowerOf2(n: number): number {
  if (n <= 0) return 2;
  let power = 1;
  while (power < n) power *= 2;
  return power;
}

function getRoundLabel(size: number): string {
  return `finale.rounds.${size}`;
}

@Component({
  selector: 'app-playoffs-form-dialog',
  imports: [
    FormsModule,
    FloatLabel,
    InputTextModule,
    Button,
    TranslocoPipe,
    MultiSelectModule,
    Message,
    TooltipModule,
    OrderListModule,
  ],
  templateUrl: './playoffs-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayoffsFormDialog {
  private readonly config =
    inject<DynamicDialogConfig<PlayoffsFormDialogData>>(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly translocoService = inject(TranslocoService);

  data = this.config.data ?? {
    serieRef: null!,
    teams: [],
  };

  currentStep = signal<1 | 2>(1);
  playoffsName = signal('');
  selectedTeams = signal<KeyValue<string, string>[]>([]);
  pendingTeamRef = signal<string[]>([]);

  availableTeams = computed<KeyValue<string, string>[]>(() => {
    const selectedIds = new Set(this.selectedTeams().map((t) => t.key));
    return this.data.teams
      .filter((team) => !selectedIds.has(team.ref.id))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((team) => ({ value: team.name, key: team.ref.id }));
  });

  bracketSize = computed(() => {
    const size = nextPowerOf2(this.selectedTeams().length);
    return size > 2 ? size : 2; // Minimum size is 2 for a final match
  });

  bracketPreview = computed((): BracketPreviewRound[] => {
    const teams = this.selectedTeams();
    const size = this.bracketSize();
    const rounds: BracketPreviewRound[] = [];

    // Generate all rounds from first round (largest) down to final
    let currentSize = size;
    let prevRoundLabel: string | null = null;

    while (currentSize >= 2) {
      const roundLabel = getRoundLabel(currentSize);
      const matchCount = currentSize / 2;
      const matches: BracketPreviewMatch[] = [];

      for (let matchNumber = 1; matchNumber <= matchCount; matchNumber++) {
        if (prevRoundLabel === null) {
          // First round: assign teams linearly
          const team1Index = (matchNumber - 1) * 2;
          const team2Index = (matchNumber - 1) * 2 + 1;
          const team1 = teams[team1Index];
          const team2 = teams[team2Index];
          const team1Name = team1?.value ?? this.translocoService.translate('playoffs.bye');
          const team2Name = team2?.value ?? this.translocoService.translate('playoffs.bye');
          matches.push({
            matchNumber,
            team1Name,
            team2Name,
            isBye: !team1 || !team2,
          });
        } else {
          // Subsequent rounds: show "Winner of match X"
          const winnerOf = (round: string, match: number) => {
            const roundLabel2 = this.translocoService.translate(round);
            return this.translocoService.translate('finale.winnerOf', {
              round: roundLabel2,
              match: String(match),
            });
          };
          matches.push({
            matchNumber,
            team1Name: winnerOf(prevRoundLabel, 2 * matchNumber - 1),
            team2Name: winnerOf(prevRoundLabel, 2 * matchNumber),
            isBye: false,
          });
        }
      }

      rounds.push({ roundLabel, roundOrder: currentSize, matches });
      prevRoundLabel = roundLabel;
      currentSize = Math.floor(currentSize / 2);
    }

    // Sort from largest round (first round) to final
    return rounds.sort((a, b) => b.roundOrder - a.roundOrder);
  });

  canGoNext = computed(
    () => this.playoffsName().trim().length > 0 && this.selectedTeams().length > 0,
  );

  onAddSelectedTeam(): void {
    const pendingTeamRefs = this.pendingTeamRef();
    if (pendingTeamRefs.length === 0) return;

    const teamsById = new Map(this.data.teams.map((team) => [team.ref.id, team.name]));
    const selectedIds = new Set(this.selectedTeams().map((team) => team.key));
    const teamsToAdd: KeyValue<string, string>[] = [];

    for (const teamRef of pendingTeamRefs) {
      if (selectedIds.has(teamRef)) {
        continue;
      }

      const teamName = teamsById.get(teamRef);
      if (!teamName) {
        continue;
      }

      selectedIds.add(teamRef);
      teamsToAdd.push({ key: teamRef, value: teamName });
    }

    if (teamsToAdd.length > 0) {
      this.selectedTeams.update((teams) => [...teams, ...teamsToAdd]);
    }

    this.pendingTeamRef.set([]);
  }

  onRemoveTeam(team: KeyValue<string, string>): void {
    this.selectedTeams.update((teams) => teams.filter((t) => t.key !== team.key));
  }

  onNext(): void {
    if (this.canGoNext()) {
      this.currentStep.set(2);
    }
  }

  onBack(): void {
    this.currentStep.set(1);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    const name = this.playoffsName().trim();
    if (!name || this.selectedTeams().length === 0) return;
    const result: SavePlayoffsEvent = {
      serieRef: this.data.serieRef,
      name,
      orderedTeamRefs: this.data.teams
        .filter((t) => this.selectedTeams().some((st) => st.key === t.ref.id))
        .map((t) => t.ref),
      size: this.bracketSize(),
    };
    this.dialogRef.close(result);
  }
}
