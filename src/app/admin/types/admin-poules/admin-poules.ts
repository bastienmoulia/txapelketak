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
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
import { AdminTeams } from '../shared/admin-teams/admin-teams';
import { Team } from '../../../tournaments/types/shared/teams/teams';
import { Tournament } from '../../../home/tournament.interface';
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
import { Games, DeleteGameEvent, SaveGameEvent } from '../../../tournaments/types/shared/games/games';
import {
  DEFAULT_POULES_ROUTE_TAB,
  getPoulesRouteTab,
  POULES_TAB_QUERY_PARAM,
} from '../../../tournaments/types/poules/poules.route';

@Component({
  selector: 'app-admin-poules',
  imports: [TabsModule, AdminTeams, TranslocoModule, PoulesTab, Games],
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

  tournament = input.required<Tournament>();
  teams = signal<Team[]>([]);
  series = signal<Serie[]>([]);

  private tournamentRef = signal<DocumentReference | null>(null);
  private loadedTournamentId = signal<number | null>(null);

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: DEFAULT_POULES_ROUTE_TAB },
  );

  activeTab = computed(() => this.tabFromUrl());

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
      const refResult = await this.firebaseService.getTournamentByIdWithRef(tournament.id);
      this.tournamentRef.set(refResult?.ref ?? null);
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
    this.series.set(await this.loadSeries(this.tournament().id));
  }

  async onDeleteGame(event: DeleteGameEvent): Promise<void> {
    await this.firebaseService.deleteGameFromPoule(event.gameRef);
    this.series.set(await this.loadSeries(this.tournament().id));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.deleted'),
      detail: this.translocoService.translate('admin.games.deletedDetail'),
    });
  }

  async onSaveSerie(event: SaveSerieEvent): Promise<void> {
    const tournamentRef = this.tournamentRef();
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
    this.series.set(await this.loadSeries(this.tournament().id));
  }

  async onDeleteSerie(serie: Serie): Promise<void> {
    const tournamentRef = this.tournamentRef();
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
    this.series.set(await this.loadSeries(this.tournament().id));
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
    this.series.set(await this.loadSeries(this.tournament().id));
  }

  async onDeletePoule(event: DeletePouleEvent): Promise<void> {
    await this.firebaseService.deletePouleFromSerie(event.poule.ref);
    this.series.set(await this.loadSeries(this.tournament().id));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.pouleDeleted'),
      detail: this.translocoService.translate('admin.poules.pouleDeletedDetail'),
    });
  }

  async onAddTeamToPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
    this.series.set(await this.loadSeries(this.tournament().id));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamAdded'),
      detail: this.translocoService.translate('admin.poules.teamAddedDetail'),
    });
  }

  async onRemoveTeamFromPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
    this.series.set(await this.loadSeries(this.tournament().id));
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamRemoved'),
      detail: this.translocoService.translate('admin.poules.teamRemovedDetail'),
    });
  }

  async onSaveTeam(team: Team): Promise<void> {
    const ref = this.tournamentRef();
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
    await this.loadTeams(this.tournament().id);
  }

  async onSaveTeams(teams: Team[]): Promise<void> {
    const ref = this.tournamentRef();
    if (!ref) {
      const newTeams = teams.map((t) => ({ ...t, id: crypto.randomUUID() }));
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
    await this.loadTeams(this.tournament().id);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.added'),
      detail: this.translocoService.translate('admin.teams.addedDetail'),
    });
  }

  async onDeleteTeam(team: Team): Promise<void> {
    const ref = this.tournamentRef();
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
    await this.loadTeams(this.tournament().id);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.deleted'),
      detail: this.translocoService.translate('admin.teams.deletedDetail'),
    });
  }
}
