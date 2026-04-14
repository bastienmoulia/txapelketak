import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { map } from 'rxjs';
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
import { Game, Serie } from '../../../tournaments/types/poules/poules';
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
import { TournamentDashboard } from '../../../tournaments/types/shared/dashboard/tournament-dashboard';
import { PoulesStore } from '../../../store/poules.store';

@Component({
  selector: 'app-admin-poules',
  imports: [
    TabsModule,
    Teams,
    TranslocoModule,
    PoulesTab,
    Games,
    AdminUsers,
    AdminImportExport,
    TournamentDashboard,
  ],
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
  private poulesStore = inject(PoulesStore);

  tournament = input.required<Tournament>();
  currentUser = input<User | null>(null);

  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  loading = this.poulesStore.loading;

  role = computed(() => this.currentUser()?.role ?? '');

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
    this.destroyRef.onDestroy(() => this.poulesStore.stopWatching());

    effect(() => {
      this.poulesStore.startWatching(this.tournament().ref);
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

  async onSaveGame(event: SaveGameEvent): Promise<void> {
    const gameData: Omit<Game, 'ref'> = {
      refTeam1: event.refTeam1,
      refTeam2: event.refTeam2,
      scoreTeam1: event.scoreTeam1 ?? undefined,
      scoreTeam2: event.scoreTeam2 ?? undefined,
      date: event.date ?? undefined,
      referees: event.referees ?? undefined,
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
  }

  async onDeleteGame(event: DeleteGameEvent): Promise<void> {
    await this.firebaseService.deleteGameFromPoule(event.gameRef);
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
        this.poulesStore.patchSeries(
          this.poulesStore
            .series()
            .map((s) => (s.ref === event.ref ? { ...s, name: event.name } : s)),
        );
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.serieEdited'),
          detail: this.translocoService.translate('admin.poules.serieEditedDetail'),
        });
      } else {
        this.poulesStore.patchSeries([
          ...this.poulesStore.series(),
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
  }

  async onDeleteSerie(serie: Serie): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
      this.poulesStore.patchSeries(this.poulesStore.series().filter((s) => s.ref !== serie.ref));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieDeleted'),
        detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteSerieFromTournament(serie.ref);
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
  }

  async onDeletePoule(event: DeletePouleEvent): Promise<void> {
    await this.firebaseService.deletePouleFromSerie(event.poule.ref);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.pouleDeleted'),
      detail: this.translocoService.translate('admin.poules.pouleDeletedDetail'),
    });
  }

  async onAddTeamToPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamAdded'),
      detail: this.translocoService.translate('admin.poules.teamAddedDetail'),
    });
  }

  async onRemoveTeamFromPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
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
        this.poulesStore.patchTeams(
          this.poulesStore.teams().map((t) => (t.ref === team.ref ? team : t)),
        );
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.teams.edited'),
          detail: this.translocoService.translate('admin.teams.editedDetail'),
        });
      } else {
        this.poulesStore.patchTeams([...this.poulesStore.teams(), { ...team, ref: null! }]);
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
  }

  async onSaveTeams(teams: Team[]): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      const newTeams = teams.map((team) => ({
        ...team,
        ref: { id: crypto.randomUUID() } as DocumentReference,
      }));
      this.poulesStore.patchTeams([...this.poulesStore.teams(), ...newTeams]);
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
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.added'),
      detail: this.translocoService.translate('admin.teams.addedDetail'),
    });
  }

  async onDeleteTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      this.poulesStore.patchTeams(this.poulesStore.teams().filter((t) => t.ref.id !== team.ref.id));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.deleted'),
        detail: this.translocoService.translate('admin.teams.deletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteTeamFromTournament(ref, team.ref.id);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.deleted'),
      detail: this.translocoService.translate('admin.teams.deletedDetail'),
    });
  }
}
