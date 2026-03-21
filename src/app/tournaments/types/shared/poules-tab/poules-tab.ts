import { Component, computed, input, output, signal } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { Team } from '../teams/teams';
import { Poule, Serie } from '../../poules/poules';
import { NgTemplateOutlet } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { Message } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

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
  ],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  role = input<string>('');

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
            refTeams: [...(poule.refTeams ?? [])].sort((a, b) => {
              const teams = this.teams();
              const nameA = teams.find((t) => t.ref.id === a.id)?.name ?? '';
              const nameB = teams.find((t) => t.ref.id === b.id)?.name ?? '';
              return nameA.localeCompare(nameB);
            }),
          })),
      })),
  );

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

  getAvailableTeams(poule: Poule, teams: Team[]): Team[] {
    return teams
      .filter((t) => !poule.refTeams?.some((ref) => ref.id === t.ref.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

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
