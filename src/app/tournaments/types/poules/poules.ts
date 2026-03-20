import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
import { Team } from '../shared/teams/teams';
import { Teams } from '../shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { PoulesTab } from '../shared/poules-tab/poules-tab';
import { DocumentReference } from '@angular/fire/firestore';
import { Games } from '../shared/games/games';
import {
  DEFAULT_POULES_ROUTE_TAB,
  getPoulesRouteTab,
  POULES_TAB_QUERY_PARAM,
} from './poules.route';

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
  games?: Game[];
}

export interface Game {
  ref: DocumentReference;
  refTeam1: DocumentReference;
  refTeam2: DocumentReference;
  scoreTeam1?: number;
  scoreTeam2?: number;
  date?: Date;
}

export function parseFirestoreDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(value as string);
}

@Component({
  selector: 'app-poules',
  imports: [TabsModule, Teams, TranslocoModule, PoulesTab, Games],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Poules {
  private firebaseService = inject(FirebaseService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);

  tournament = input.required<Tournament>();
  teams = signal<Team[]>([]);
  series = signal<Serie[]>([]);
  private loadedTournamentId = signal<number | null>(null);

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: DEFAULT_POULES_ROUTE_TAB },
  );

  activeTab = computed(() => this.tabFromUrl());

  teamsWithContext = computed(() => {
    const teams = this.teams();
    const series = this.series();
    const contextMap = new Map<string, { serieName: string; pouleName: string }>();
    for (const serie of series) {
      for (const poule of serie.poules ?? []) {
        for (const ref of poule.refTeams ?? []) {
          contextMap.set(ref.id, { serieName: serie.name, pouleName: poule.name });
        }
      }
    }
    return teams.map((team) => {
      const context = team.ref?.id ? contextMap.get(team.ref.id) : undefined;
      return context ? { ...team, ...context } : team;
    });
  });

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

  onTabChange(nextTab: string | number | undefined): void {
    if (typeof nextTab !== 'string') {
      return;
    }

    const routeTab = getPoulesRouteTab(nextTab);
    if (routeTab === this.activeTab()) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [POULES_TAB_QUERY_PARAM]: routeTab },
      queryParamsHandling: 'merge',
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

    const seriesWithPoules = await Promise.all(
      series.map(async (serie) => {
        return {
          ...serie,
          poules: await this.loadPoules(serie.ref),
        } as Serie;
      }),
    );

    return seriesWithPoules;
  }

  private async loadPoules(serieRef: DocumentReference): Promise<Poule[]> {
    const result = await this.firebaseService.getCollectionFromDocumentRef(serieRef, 'poules');
    const poules = (result?.map((item, index) => {
      return {
        ...(item.data as Partial<Poule>),
        ref: result[index].ref,
      } as Poule;
    }) ?? []) as Poule[];
    return Promise.all(
      poules.map(async (poule) => ({
        ...poule,
        games: await this.loadGames(poule.ref),
      })),
    );
  }

  private async loadGames(pouleRef: DocumentReference): Promise<Game[]> {
    const result = await this.firebaseService.getCollectionFromDocumentRef(pouleRef, 'games');
    return (result?.map((item, index) => {
      const data = item.data as Partial<Game>;
      return {
        ...data,
        ref: result[index].ref,
        date: parseFirestoreDate(data.date),
      } as Game;
    }) ?? []) as Game[];
  }
}
