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
import { Game, Serie } from '../../../tournaments/types/poules/poules';
import {
  Games,
  DeleteGameEvent,
  SaveGameEvent,
} from '../../../tournaments/types/shared/games/games';
import {
  POULES_ROUTE_TABS,
  getPoulesRouteTab,
  POULES_TAB_QUERY_PARAM,
} from '../../../tournaments/types/poules/poules.route';
import { AdminUsers } from '../shared/admin-users/admin-users';
import { AdminImportExport } from '../shared/admin-import-export/admin-import-export';
import { AdminGeneral } from '../shared/admin-general/admin-general';
import { AdminDeleteTournament } from '../shared/admin-delete-tournament/admin-delete-tournament';
import { AdminTimeSlots } from '../shared/admin-time-slots/admin-time-slots';
import { TournamentDashboard } from '../../../tournaments/types/shared/dashboard/tournament-dashboard';
import { PoulesStore } from '../../../store/poules.store';
import {
  FinaleTab,
  GenerateBracketEvent,
  SaveFinaleGameEvent,
  UpdateFinaleSizeEvent,
  DeleteBracketEvent,
} from '../../../tournaments/types/shared/finale-tab/finale-tab';
import { generateFinaleBracket } from '../../../shared/utils/finale-bracket.utils';
import {
  SaveSerieEvent,
} from '../../../tournaments/types/shared/poules-tab/poules-tab';

@Component({
  selector: 'app-admin-finale',
  imports: [
    TabsModule,
    Teams,
    TranslocoModule,
    FinaleTab,
    Games,
    AdminUsers,
    AdminImportExport,
    AdminGeneral,
    AdminDeleteTournament,
    AdminTimeSlots,
    TournamentDashboard,
  ],
  templateUrl: './admin-finale.html',
  styleUrl: './admin-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFinale {
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
  timeSlots = this.poulesStore.timeSlots;
  loading = this.poulesStore.loading;

  role = computed(() => this.currentUser()?.role ?? '');

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => getPoulesRouteTab(queryParams.get(POULES_TAB_QUERY_PARAM))),
    ),
    { initialValue: POULES_ROUTE_TABS[0] },
  );

  activeTab = computed(() => this.tabFromUrl());

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

  async onSaveFinaleGame(event: SaveFinaleGameEvent): Promise<void> {
    await this.firebaseService.updateFinaleGame(event.gameRef, {
      refTeam1: event.refTeam1 ?? undefined,
      refTeam2: event.refTeam2 ?? undefined,
      team1Label: event.team1Label ?? undefined,
      team2Label: event.team2Label ?? undefined,
      scoreTeam1: event.scoreTeam1 ?? undefined,
      scoreTeam2: event.scoreTeam2 ?? undefined,
      date: event.date ?? undefined,
    });
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.edited'),
      detail: this.translocoService.translate('admin.games.editedDetail'),
    });
  }

  async onUpdateFinaleSize(event: UpdateFinaleSizeEvent): Promise<void> {
    await this.firebaseService.updateSerieFinaleSize(event.serieRef, event.finaleSize);
  }

  async onGenerateBracket(event: GenerateBracketEvent): Promise<void> {
    const games = generateFinaleBracket(event.serieName, event.finaleSize, {
      final: this.translocoService.translate('admin.finale.phase.final'),
      thirdPlace: this.translocoService.translate('admin.finale.phase.thirdPlace'),
      semifinal: this.translocoService.translate('admin.finale.phase.semifinal'),
      quarterfinal: this.translocoService.translate('admin.finale.phase.quarterfinal'),
      roundOf16: this.translocoService.translate('admin.finale.phase.roundOf16'),
      roundOf32: this.translocoService.translate('admin.finale.phase.roundOf32'),
      winnerOf: (game) =>
        this.translocoService.translate('admin.finale.winnerOf', { game }),
      loserOf: (game) =>
        this.translocoService.translate('admin.finale.loserOf', { game }),
    });
    await this.firebaseService.generateFinaleGamesForSerie(event.serieRef, games);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.finale.bracketGenerated'),
      detail: this.translocoService.translate('admin.finale.bracketGeneratedDetail', {
        count: games.length,
      }),
    });
  }

  async onDeleteBracket(event: DeleteBracketEvent): Promise<void> {
    await this.firebaseService.deleteFinaleGamesFromSerie(event.serieRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.finale.bracketDeleted'),
      detail: this.translocoService.translate('admin.finale.bracketDeletedDetail'),
    });
  }

  async onSaveSerie(event: SaveSerieEvent): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
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
    await this.firebaseService.deleteSerieFromTournament(serie.ref);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.serieDeleted'),
      detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
    });
  }

  async onSaveTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
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
