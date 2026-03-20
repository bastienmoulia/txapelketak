import { Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Game, Poule, Serie } from '../../poules/poules';
import { Team } from '../teams/teams';
import { AccordionModule } from 'primeng/accordion';
import { Message } from 'primeng/message';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePicker } from 'primeng/datepicker';
import { DocumentReference } from '@angular/fire/firestore';

export interface SaveGameEvent {
  pouleRef: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number | null;
  scoreTeam2?: number | null;
  date?: Date | null;
  gameRef?: DocumentReference;
}

export interface DeleteGameEvent {
  gameRef: DocumentReference;
}

@Component({
  selector: 'app-games',
  imports: [
    AccordionModule,
    Message,
    NgTemplateOutlet,
    TranslocoPipe,
    Card,
    DatePipe,
    Button,
    DialogModule,
    FormsModule,
    FloatLabel,
    Select,
    InputNumberModule,
    DatePicker,
  ],
  templateUrl: './games.html',
  styleUrl: './games.css',
})
export class Games {
  private readonly translocoService = inject(TranslocoService);

  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  admin = input(false);

  saveGame = output<SaveGameEvent>();
  deleteGame = output<DeleteGameEvent>();

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  sortedSeries = computed(() =>
    [...this.series()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((serie) => ({
        ...serie,
        poules: [...serie.poules]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((poule) => ({
            ...poule,
            games: [...(poule.games ?? [])].sort((a, b) => {
              const aDate = a.date ? new Date(a.date).getTime() : 0;
              const bDate = b.date ? new Date(b.date).getTime() : 0;
              return aDate - bDate;
            }),
          })),
      })),
  );

  // Dialog state
  gameDialogVisible = signal(false);
  isEditingGame = signal(false);
  editingGameRef = signal<DocumentReference | null>(null);
  currentPouleRef = signal<DocumentReference | null>(null);
  currentPouleRefTeams = signal<DocumentReference[]>([]);

  selectedTeam1Ref = signal<DocumentReference | null>(null);
  selectedTeam2Ref = signal<DocumentReference | null>(null);
  scoreTeam1 = signal<number | null>(null);
  scoreTeam2 = signal<number | null>(null);
  gameDate = signal<Date | null>(null);

  // Teams available for the current poule dialog
  dialogTeams = computed(() => {
    const refTeams = this.currentPouleRefTeams();
    console.log('Calculating dialog teams for refs:', refTeams);
    return this.teams()
      .filter((t) => refTeams.some((ref) => ref.id === t.ref?.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  // Map of team ref.id → team name for fast lookup in template
  teamNameMap = computed(() => {
    const map = new Map<string, string>();
    for (const team of this.teams()) {
      if (team.ref?.id) map.set(team.ref.id, team.name);
    }
    return map;
  });

  // Delete confirmation dialog state
  deleteConfirmVisible = signal(false);
  pendingDeleteGameRef = signal<DocumentReference | null>(null);

  getTeamName(ref: DocumentReference): string {
    if (!ref) return '?';
    return this.teamNameMap().get(ref.id) ?? '?';
  }

  onAddGame(poule: Poule): void {
    this.isEditingGame.set(false);
    this.editingGameRef.set(null);
    this.currentPouleRef.set(poule.ref);
    this.currentPouleRefTeams.set(poule.refTeams ?? []);
    this.selectedTeam1Ref.set(null);
    this.selectedTeam2Ref.set(null);
    this.scoreTeam1.set(null);
    this.scoreTeam2.set(null);
    this.gameDate.set(null);
    this.gameDialogVisible.set(true);
  }

  onEditGame(poule: Poule, game: Game): void {
    this.isEditingGame.set(true);
    this.editingGameRef.set(game.ref);
    this.currentPouleRef.set(poule.ref);
    this.currentPouleRefTeams.set(poule.refTeams ?? []);
    this.selectedTeam1Ref.set(game.refTeam1 ?? null);
    this.selectedTeam2Ref.set(game.refTeam2 ?? null);
    this.scoreTeam1.set(game.scoreTeam1 ?? null);
    this.scoreTeam2.set(game.scoreTeam2 ?? null);
    this.gameDate.set(game.date ? new Date(game.date) : null);
    this.gameDialogVisible.set(true);
  }

  onSaveGame(): void {
    const team1Ref = this.selectedTeam1Ref();
    const team2Ref = this.selectedTeam2Ref();
    const pouleRef = this.currentPouleRef();
    if (!team1Ref || !team2Ref || !pouleRef) return;

    this.saveGame.emit({
      pouleRef,
      refTeam1: team1Ref,
      refTeam2: team2Ref,
      scoreTeam1: this.scoreTeam1(),
      scoreTeam2: this.scoreTeam2(),
      date: this.gameDate(),
      gameRef: this.editingGameRef() ?? undefined,
    });
    this.gameDialogVisible.set(false);
  }

  onDeleteGame(gameRef: DocumentReference): void {
    this.pendingDeleteGameRef.set(gameRef);
    this.deleteConfirmVisible.set(true);
  }

  onConfirmDelete(): void {
    const gameRef = this.pendingDeleteGameRef();
    if (gameRef) {
      this.deleteGame.emit({ gameRef });
      this.pendingDeleteGameRef.set(null);
    }
    this.deleteConfirmVisible.set(false);
  }

  onCancelDelete(): void {
    this.pendingDeleteGameRef.set(null);
    this.deleteConfirmVisible.set(false);
  }
}
