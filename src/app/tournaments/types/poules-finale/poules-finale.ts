import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';
import {
  KnockoutMatch,
  KnockoutRound,
  buildKnockoutRounds,
  parseKnockoutMatch,
} from '../finale/finale.model';
import { KnockoutBracket } from '../shared/knockout-bracket/knockout-bracket';
import { Serie, Poule, Game, parseFirestoreDate } from '../poules/poules';
import { Team } from '../shared/teams/teams';
import { Teams } from '../shared/teams/teams';
import { PoulesTab } from '../shared/poules-tab/poules-tab';
import { Games } from '../shared/games/games';
import { TournamentDashboard } from '../shared/dashboard/tournament-dashboard';
import { POULES_TAB_QUERY_PARAM } from '../poules/poules.route';

export interface PoulesFinaleData {
  numberOfTeams?: number;
}

const ALL_TABS = ['dashboard', 'teams', 'poules', 'games', 'finale'] as const;
type PoulesFinaleRouteTab = (typeof ALL_TABS)[number];

@Component({
  selector: 'app-poules-finale',
  imports: [
    TabsModule,
    TranslocoModule,
    Teams,
    PoulesTab,
    Games,
    KnockoutBracket,
    TournamentDashboard,
  ],
  templateUrl: './poules-finale.html',
  styleUrl: './poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoulesFinale {
  private firebaseService = inject(FirebaseService);
  private translocoService = inject(TranslocoService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();

  teams = signal<Team[]>([]);
  series = signal<Serie[]>([]);
  knockoutMatches = signal<KnockoutMatch[]>([]);
  private loadedTournamentId = signal<string | null>(null);

  finaleData = computed(() => (this.tournament().data as PoulesFinaleData) ?? {});

  totalRounds = computed(() => {
    const n = this.finaleData().numberOfTeams ?? 0;
    return n >= 2 ? Math.log2(n) : 0;
  });

  knockoutRounds = computed((): KnockoutRound[] => {
    const total = this.totalRounds();
    if (total < 1) return [];
    return buildKnockoutRounds(this.knockoutMatches(), total, (key) =>
      this.translocoService.translate(key),
    );
  });

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

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => {
        const v = queryParams.get(POULES_TAB_QUERY_PARAM);
        return (ALL_TABS.includes(v as PoulesFinaleRouteTab) ? v : 'dashboard') as PoulesFinaleRouteTab;
      }),
    ),
    { initialValue: 'dashboard' as PoulesFinaleRouteTab },
  );

  activeTab = computed(() => this.tabFromUrl());

  constructor() {
    effect(async () => {
      const tournament = this.tournament();

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.ref.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.ref.id);
      this.teams.set(await this.loadTeams(tournament.ref));
      const series = await this.loadSeries(tournament.ref);
      this.series.set(series);
      await this.loadKnockoutMatches(tournament.ref);
      this.watchKnockoutMatches(tournament.ref);
    });
  }

  onTabChange(nextTab: string | number | undefined): void {
    if (typeof nextTab !== 'string') return;
    if (nextTab === this.activeTab()) return;
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [POULES_TAB_QUERY_PARAM]: nextTab },
      queryParamsHandling: 'merge',
    });
  }

  private async loadTeams(tournamentRef: DocumentReference): Promise<Team[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentRef, 'teams');
    return result.map((item, index) => ({
      ...(item.data as Partial<Team>),
      ref: result[index].ref,
    })) as Team[];
  }

  private async loadSeries(tournamentRef: DocumentReference): Promise<Serie[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentRef, 'series');
    const series = result.map((item, index) => ({
      ...(item.data as Partial<Serie>),
      ref: result[index].ref,
    })) as Serie[];
    return Promise.all(
      series.map(async (serie) => ({
        ...serie,
        poules: await this.loadPoules(serie.ref),
      })),
    );
  }

  private async loadPoules(serieRef: DocumentReference): Promise<Poule[]> {
    const result = await this.firebaseService.getCollectionFromDocumentRef(serieRef, 'poules');
    const poules = (result?.map((item, index) => ({
      ...(item.data as Partial<Poule>),
      ref: result[index].ref,
    })) ?? []) as Poule[];
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

  private async loadKnockoutMatches(tournamentRef: DocumentReference): Promise<void> {
    const result = await this.firebaseService.getCollectionFromDocumentRef(
      tournamentRef,
      'knockoutMatches',
    );
    this.knockoutMatches.set(
      result.map((item) => parseKnockoutMatch(item.data as Partial<KnockoutMatch>, item.ref)),
    );
  }

  private watchKnockoutMatches(tournamentRef: DocumentReference): void {
    this.firebaseService
      .watchKnockoutMatches(tournamentRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.knockoutMatches.set(
          items.map((item) =>
            parseKnockoutMatch(item.data as Partial<KnockoutMatch>, item.ref),
          ),
        );
      });
  }
}
