import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { Team } from '../shared/teams/teams';
import { Teams } from '../shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { PoulesTab } from '../shared/poules-tab/poules-tab';
import { DocumentReference } from '@angular/fire/firestore';

export interface PoulesData {
  teams?: Team[];
  series?: Serie[];
}

export interface Serie {
  ref: DocumentReference;
  name: string;
  poules: Poule[];
}

export interface Poule {
  ref: DocumentReference;
  name: string;
  refTeams: DocumentReference[];
}

@Component({
  selector: 'app-poules',
  imports: [TabsModule, Teams, TranslocoModule, PoulesTab],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  private firebaseService = inject(FirebaseService);

  tournament = input.required<Tournament>();
  teams = signal<Team[]>([]);
  series = signal<Serie[]>([]);
  private loadedTournamentId = signal<number | null>(null);

  constructor() {
    effect(async () => {
      const tournament = this.tournament();
      this.teams.set((tournament.data?.teams as Team[] | undefined) ?? []);

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.id);
      this.teams.set(await this.loadTeams(tournament.id));
      this.series.set(await this.loadSeries(tournament.id));
    });
  }

  private async loadTeams(tournamentId: number): Promise<Team[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentId, 'teams');
    const teams =
      result?.map((item, index) => {
        return {
          ...(item.data as Partial<Team>),
          ref: result[index].ref,
        } as Team;
      }) ?? [];
    return teams;
  }

  private async loadSeries(tournamentId: number): Promise<Serie[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentId, 'series');
    const series = (result?.map((item, index) => {
      return {
        ...(item.data as Partial<Serie>),
        ref: result[index].ref,
      } as Serie;
    }) ?? []) as Serie[];

    series.forEach(async (serie, index) => {
      serie.poules = (await this.loadPoules(series[index].ref)) as unknown as Poule[];
    });
    return series;
  }

  private async loadPoules(serieRef: DocumentReference): Promise<Poule[]> {
    const result = await this.firebaseService.getCollectionFromDocumentRef(serieRef, 'poules');
    const poules = (result?.map((item, index) => {
      return {
        ...(item.data as Partial<Poule>),
        ref: result[index].ref,
      } as Poule;
    }) ?? []) as Poule[];
    return poules;
  }
}
