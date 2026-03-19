import { Component, input, output, signal } from '@angular/core';
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
import { SelectModule } from 'primeng/select';
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
    CardModule,
    NgTemplateOutlet,
    ApplyPipe,
    Button,
    TranslocoPipe,
    Message,
    DialogModule,
    InputTextModule,
    FloatLabel,
    SelectModule,
    FormsModule,
  ],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  admin = input(false);

  saveSerie = output<SaveSerieEvent>();
  deleteSerie = output<Serie>();
  savePoule = output<SavePouleEvent>();
  deletePoule = output<DeletePouleEvent>();
  addTeamToPoule = output<TeamInPouleEvent>();
  removeTeamFromPoule = output<TeamInPouleEvent>();

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
  selectedTeamRef = signal<DocumentReference | null>(null);

  getTeamName(ref: DocumentReference, teams: Team[]): string {
    if (!ref) {
      return 'Unknown Team';
    }
    const team = teams.find((t) => t.ref.id === ref.id);
    return team ? team.name : 'Unknown Team';
  }

  getAvailableTeams(poule: Poule, teams: Team[]): Team[] {
    return teams.filter((t) => !poule.refTeams?.some((ref) => ref.id === t.ref.id));
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
    this.deleteSerie.emit(serie);
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
    this.deletePoule.emit({ serieRef, poule });
  }

  onAddTeamToPoule(poule: Poule): void {
    this.teamPouleTarget.set(poule);
    this.selectedTeamRef.set(null);
    this.teamPouleDialogVisible.set(true);
  }

  onSaveTeamToPoule(): void {
    const poule = this.teamPouleTarget();
    const teamRef = this.selectedTeamRef();
    if (!poule || !teamRef) return;
    this.addTeamToPoule.emit({ poule, teamRef });
    this.teamPouleDialogVisible.set(false);
  }

  onRemoveTeamFromPoule(poule: Poule, teamRef: DocumentReference): void {
    this.removeTeamFromPoule.emit({ poule, teamRef });
  }
}
