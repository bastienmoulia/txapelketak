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
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { map, skip, Subject, takeUntil } from 'rxjs';
import { Team, Teams } from '../../../tournaments/types/shared/teams/teams';
import { Tournament, User } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';
import {
  DeletePouleEvent,
  PoulesTab,
  SavePouleEvent,
  SaveSerieEvent,
  TeamInPouleEvent,
} from '../../../tournaments/types/shared/poules-tab/poules-tab';
import { Game, parseFirestoreDate, Poule, Serie } from '../../../tournaments/types/poules/poules';
import {
  Games,
  DeleteGameEvent,
  GenerateAllGamesEvent,
  SaveGameEvent,
} from '../../../tournaments/types/shared/games/games';
import {
  POULES_ROUTE_TABS,
  getPoulesRouteTab,
  POULES_TAB_QUERY_PARAM,
} from '../../../tournaments/types/poules/poules.route';
import { AdminUsers } from '../shared/admin-users/admin-users';
import { AdminImportExport } from '../shared/admin-import-export/admin-import-export';

@Component({
  selector: 'app-admin-poules',
  imports: [TabsModule, Teams, TranslocoModule, PoulesTab, Games, AdminUsers, AdminImportExport],
  templateUrl: './admin-poules.html',
  styleUrl: './admin-poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoules {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();
  currentUser = input<User | null>(null);

  teams = signal<Team[]>([]);
  series = signal<Serie[]>([]);

  role = computed(() => this.currentUser()?.role ?? '');

  private loadedTournamentId = signal<string | null>(null);
  private readonly stopGameSubs$ = new Subject<void>();

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: POULES_ROUTE_TABS[0] },
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
    this.destroyRef.onDestroy(() => {
      this.stopGameSubs$.next();
      this.stopGameSubs$.complete();
    });

    effect(async () => {
      const tournament = this.tournament();
      this.teams.set((tournament.data?.teams as Team[] | undefined) ?? []);

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.ref.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.ref.id);
      this.teams.set(await this.loadTeams(tournament.ref));
      this.watchTeams(tournament.ref);
      await this.reloadSeries();
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

  private async loadTeams(tournamentRef: DocumentReference): Promise<Team[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentRef, 'teams');
    const teams = result.map((item, index) => {
      return {
        ...(item.data as Partial<Team>),
        ref: result[index].ref,
      } as Team;
    });
    return teams;
  }

  private async loadSeries(tournamentRef: DocumentReference): Promise<Serie[]> {
    const result = await this.firebaseService.getTournamentCollection(tournamentRef, 'series');
    const series = result.map((item, index) => {
      return {
        ...(item.data as Partial<Serie>),
        ref: result[index].ref,
      } as Serie;
    }) as Serie[];

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

  private async reloadSeries(): Promise<void> {
    const series = await this.loadSeries(this.tournament().ref);
    this.series.set(series);
    this.watchGames(series);
  }

  private watchTeams(tournamentRef: DocumentReference): void {
    this.firebaseService
      .watchCollectionFromDocumentRef(tournamentRef, 'teams')
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        const teams = items.map((item) => ({
          ...(item.data as Partial<Team>),
          ref: item.ref,
        })) as Team[];
        this.teams.set(teams);
      });
  }

  private watchGames(series: Serie[]): void {
    this.stopGameSubs$.next();
    for (const serie of series) {
      for (const poule of serie.poules ?? []) {
        this.firebaseService
          .watchCollectionFromDocumentRef(poule.ref, 'games')
          .pipe(takeUntilDestroyed(this.destroyRef), takeUntil(this.stopGameSubs$))
          .subscribe((items) => {
            const games = items.map((item) => {
              const data = item.data as Partial<Game>;
              return {
                ...data,
                ref: item.ref,
                date: parseFirestoreDate(data.date),
              } as Game;
            });
            this.series.update((currentSeries) =>
              currentSeries.map((s) => ({
                ...s,
                poules: (s.poules ?? []).map((p) =>
                  p.ref.id === poule.ref.id ? { ...p, games } : p,
                ),
              })),
            );
          });
      }
    }
  }

  async onSaveGame(event: SaveGameEvent): Promise<void> {
    const gameData: Omit<Game, 'ref'> = {
      refTeam1: event.refTeam1,
      refTeam2: event.refTeam2,
      scoreTeam1: event.scoreTeam1 ?? undefined,
      scoreTeam2: event.scoreTeam2 ?? undefined,
      date: event.date ?? undefined,
    };
    if (event.gameRef) {
      await this.firebaseService.updateGame(event.gameRef, gameData);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.games.edited'),
        detail: this.translocoService.translate('admin.games.editedDetail'),
      });
    } else {
      await this.firebaseService.addGameToPoule(event.pouleRef, gameData);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.games.added'),
        detail: this.translocoService.translate('admin.games.addedDetail'),
      });
    }
    await this.reloadSeries();
  }

  async onDeleteGame(event: DeleteGameEvent): Promise<void> {
    await this.firebaseService.deleteGameFromPoule(event.gameRef);
    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.deleted'),
      detail: this.translocoService.translate('admin.games.deletedDetail'),
    });
  }

  async onGenerateAllGames(event: GenerateAllGamesEvent): Promise<void> {
    if (event.games.length === 0) {
      return;
    }

    await Promise.all(
      event.games.map((game) =>
        this.firebaseService.addGameToPoule(game.pouleRef, {
          refTeam1: game.refTeam1,
          refTeam2: game.refTeam2,
        }),
      ),
    );

    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.generated'),
      detail: this.translocoService.translate('admin.games.generatedDetail', {
        count: event.games.length,
      }),
    });
  }

  async onSaveSerie(event: SaveSerieEvent): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
      if (event.ref) {
        this.series.update((series) =>
          series.map((s) => (s.ref === event.ref ? { ...s, name: event.name } : s)),
        );
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.serieEdited'),
          detail: this.translocoService.translate('admin.poules.serieEditedDetail'),
        });
      } else {
        this.series.update((series) => [
          ...series,
          { name: event.name, poules: [], ref: null as unknown as DocumentReference },
        ]);
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.serieAdded'),
          detail: this.translocoService.translate('admin.poules.serieAddedDetail'),
        });
      }
      return;
    }

    if (event.ref) {
      await this.firebaseService.updateSerieInTournament(event.ref, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieEdited'),
        detail: this.translocoService.translate('admin.poules.serieEditedDetail'),
      });
    } else {
      await this.firebaseService.addSeriesToTournament(tournamentRef, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieAdded'),
        detail: this.translocoService.translate('admin.poules.serieAddedDetail'),
      });
    }
    await this.reloadSeries();
  }

  async onDeleteSerie(serie: Serie): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
      this.series.update((series) => series.filter((s) => s.ref !== serie.ref));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieDeleted'),
        detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteSerieFromTournament(serie.ref);
    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.serieDeleted'),
      detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
    });
  }

  async onSavePoule(event: SavePouleEvent): Promise<void> {
    if (event.ref) {
      await this.firebaseService.updatePouleInSerie(event.ref, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.pouleEdited'),
        detail: this.translocoService.translate('admin.poules.pouleEditedDetail'),
      });
    } else {
      await this.firebaseService.addPouleToSerie(event.serieRef, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.pouleAdded'),
        detail: this.translocoService.translate('admin.poules.pouleAddedDetail'),
      });
    }
    await this.reloadSeries();
  }

  async onDeletePoule(event: DeletePouleEvent): Promise<void> {
    await this.firebaseService.deletePouleFromSerie(event.poule.ref);
    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.pouleDeleted'),
      detail: this.translocoService.translate('admin.poules.pouleDeletedDetail'),
    });
  }

  async onAddTeamToPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamAdded'),
      detail: this.translocoService.translate('admin.poules.teamAddedDetail'),
    });
  }

  async onRemoveTeamFromPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
    await this.reloadSeries();
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamRemoved'),
      detail: this.translocoService.translate('admin.poules.teamRemovedDetail'),
    });
  }

  async onSaveTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      if (team.ref) {
        this.teams.update((teams) => teams.map((t) => (t.ref === team.ref ? team : t)));
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.teams.edited'),
          detail: this.translocoService.translate('admin.teams.editedDetail'),
        });
      } else {
        this.teams.update((teams) => [...teams, { ...team, ref: null! }]);
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.teams.added'),
          detail: this.translocoService.translate('admin.teams.addedDetail'),
        });
      }
      return;
    }

    if (team.ref) {
      await this.firebaseService.updateTeamInTournament(ref, team);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.edited'),
        detail: this.translocoService.translate('admin.teams.editedDetail'),
      });
    } else {
      await this.firebaseService.addTeamToTournament(ref, team.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.added'),
        detail: this.translocoService.translate('admin.teams.addedDetail'),
      });
    }
    this.teams.set(await this.loadTeams(this.tournament().ref));
  }

  async onSaveTeams(teams: Team[]): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      const newTeams = teams.map((team) => ({
        ...team,
        ref: { id: crypto.randomUUID() } as DocumentReference,
      }));
      this.teams.update((existing) => [...existing, ...newTeams]);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.added'),
        detail: this.translocoService.translate('admin.teams.addedDetail'),
      });
      return;
    }

    for (const team of teams) {
      await this.firebaseService.addTeamToTournament(ref, team.name);
    }
    this.teams.set(await this.loadTeams(this.tournament().ref));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.added'),
      detail: this.translocoService.translate('admin.teams.addedDetail'),
    });
  }

  async onDeleteTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      this.teams.update((teams) => teams.filter((t) => t.ref.id !== team.ref.id));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.deleted'),
        detail: this.translocoService.translate('admin.teams.deletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteTeamFromTournament(ref, team.ref.id);
    this.teams.set(await this.loadTeams(this.tournament().ref));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.deleted'),
      detail: this.translocoService.translate('admin.teams.deletedDetail'),
    });
  }
}
