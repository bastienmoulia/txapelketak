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
import { from, map, skip, Subject, switchMap, takeUntil } from 'rxjs';
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
import { TournamentDashboard } from '../../../tournaments/types/shared/dashboard/tournament-dashboard';
import { ToastModule } from 'primeng/toast';
import {
  FinaleData,
  KnockoutMatch,
  KnockoutRound,
  buildKnockoutRounds,
  generateKnockoutBracket,
  parseKnockoutMatch,
} from '../../../tournaments/types/finale/finale.model';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DatePicker } from 'primeng/datepicker';
import { InputMaskModule } from 'primeng/inputmask';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';

const ALL_TABS = [
  'dashboard',
  'teams',
  'poules',
  'games',
  'finale',
  'users',
  'import-export',
] as const;
type PoulesFinaleRouteTab = (typeof ALL_TABS)[number];

const TEAM_SIZES = [2, 4, 8, 16, 32];

@Component({
  selector: 'app-admin-poules-finale',
  imports: [
    TabsModule,
    Teams,
    TranslocoModule,
    PoulesTab,
    Games,
    AdminUsers,
    AdminImportExport,
    TournamentDashboard,
    ToastModule,
    ButtonModule,
    DialogModule,
    FormsModule,
    FloatLabel,
    InputTextModule,
    InputNumberModule,
    DatePicker,
    InputMaskModule,
    CheckboxModule,
    SelectModule,
  ],
  templateUrl: './admin-poules-finale.html',
  styleUrl: './admin-poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class AdminPoulesFinale {
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
  knockoutMatches = signal<KnockoutMatch[]>([]);
  numberOfTeams = signal<number>(8);
  teamSizes = TEAM_SIZES;

  role = computed(() => this.currentUser()?.role ?? '');

  private loadedTournamentId = signal<string | null>(null);
  private readonly stopGameSubs$ = new Subject<void>();

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
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

  totalRounds = computed(() => {
    const n = this.numberOfTeams();
    return n >= 2 ? Math.log2(n) : 0;
  });

  knockoutRounds = computed((): KnockoutRound[] => {
    const matches = this.knockoutMatches();
    const total = this.totalRounds();
    if (total < 1) return [];
    return buildKnockoutRounds(matches, total, (key) =>
      this.translocoService.translate(key),
    );
  });

  // Edit match dialog state
  matchDialogVisible = signal(false);
  editingMatch = signal<KnockoutMatch | null>(null);
  editTeam1Name = signal('');
  editTeam2Name = signal('');
  editScoreTeam1 = signal<number | null>(null);
  editScoreTeam2 = signal<number | null>(null);
  editMatchDate = signal<Date | null>(null);
  editMatchFinished = signal(false);
  editMatchDateString = '';

  // Confirm regenerate dialog
  confirmRegenerateVisible = signal(false);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopGameSubs$.next();
      this.stopGameSubs$.complete();
    });

    effect(async () => {
      const tournament = this.tournament();
      const data = tournament.data as FinaleData | undefined;
      if (data?.numberOfTeams) {
        this.numberOfTeams.set(data.numberOfTeams);
      }

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.ref.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.ref.id);
      this.teams.set(await this.loadTeams(tournament.ref));
      this.watchTeams(tournament.ref);
      const initialSeries = await this.loadSeries(tournament.ref);
      this.series.set(initialSeries);
      this.watchGames(initialSeries);
      this.watchSeriesStructure(tournament.ref);
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
    const matches = result.map((item) =>
      parseKnockoutMatch(item.data as Partial<KnockoutMatch>, item.ref),
    );
    this.knockoutMatches.set(matches);
  }

  private watchTeams(tournamentRef: DocumentReference): void {
    this.firebaseService
      .watchCollectionFromDocumentRef(tournamentRef, 'teams')
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.teams.set(
          items.map((item) => ({
            ...(item.data as Partial<Team>),
            ref: item.ref,
          })) as Team[],
        );
      });
  }

  private watchSeriesStructure(tournamentRef: DocumentReference): void {
    this.firebaseService
      .watchCollectionFromDocumentRef(tournamentRef, 'series')
      .pipe(
        skip(1),
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => {
          this.stopGameSubs$.next();
          return from(this.loadSeries(tournamentRef));
        }),
      )
      .subscribe((series) => {
        this.series.set(series);
        this.watchGames(series);
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

  private watchKnockoutMatches(tournamentRef: DocumentReference): void {
    this.firebaseService
      .watchKnockoutMatches(tournamentRef)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        const matches = items.map((item) =>
          parseKnockoutMatch(item.data as Partial<KnockoutMatch>, item.ref),
        );
        this.knockoutMatches.set(matches);
      });
  }

  onRequestGenerate(): void {
    if (this.knockoutMatches().length > 0) {
      this.confirmRegenerateVisible.set(true);
    } else {
      void this.generateBracket();
    }
  }

  async onConfirmRegenerate(): Promise<void> {
    this.confirmRegenerateVisible.set(false);
    await this.generateBracket();
  }

  async generateBracket(): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) return;

    const n = this.numberOfTeams();
    const matches = generateKnockoutBracket(n, (key, params) =>
      this.translocoService.translate(key, params),
    );

    await this.firebaseService.deleteAllKnockoutMatches(tournamentRef);
    await Promise.all(
      matches.map((match) => this.firebaseService.addKnockoutMatch(tournamentRef, match)),
    );
    await this.firebaseService.updateTournamentData(tournamentRef, {
      'data.numberOfTeams': n,
    });

    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.finale.generated'),
      detail: this.translocoService.translate('admin.finale.generatedDetail', {
        count: matches.length,
      }),
    });
  }

  onEditMatch(match: KnockoutMatch): void {
    this.editingMatch.set(match);
    this.editTeam1Name.set(match.team1Name ?? '');
    this.editTeam2Name.set(match.team2Name ?? '');
    this.editScoreTeam1.set(match.scoreTeam1 ?? null);
    this.editScoreTeam2.set(match.scoreTeam2 ?? null);
    this.editMatchFinished.set(match.finished ?? false);
    const d = match.date ? new Date(match.date) : null;
    this.editMatchDate.set(d);
    this.editMatchDateString = this.formatDateForMask(d);
    this.matchDialogVisible.set(true);
  }

  async onSaveMatch(): Promise<void> {
    const match = this.editingMatch();
    if (!match) return;

    await this.firebaseService.updateKnockoutMatch(match.ref, {
      team1Name: this.editTeam1Name(),
      team2Name: this.editTeam2Name(),
      scoreTeam1: this.editScoreTeam1(),
      scoreTeam2: this.editScoreTeam2(),
      date: this.editMatchDate() ?? undefined,
      finished: this.editMatchFinished(),
    });

    this.matchDialogVisible.set(false);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.finale.matchEdited'),
      detail: this.translocoService.translate('admin.finale.matchEditedDetail'),
    });
  }

  private formatDateForMask(date: Date | null): string {
    if (!date) return '';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    if (this.activeLanguage() === 'en') {
      return `${m}/${d}/${y} ${h}:${min}`;
    }
    return `${d}/${m}/${y} ${h}:${min}`;
  }

  get editMatchDateModel(): Date | string | null {
    return this.editMatchDate() ?? (this.editMatchDateString || null);
  }

  set editMatchDateModel(value: Date | string | null) {
    if (value instanceof Date && !isNaN(value.getTime())) {
      this.editMatchDate.set(value);
      this.editMatchDateString = this.formatDateForMask(value);
      return;
    }
    if (typeof value === 'string') {
      this.editMatchDateString = value;
      if (!value) this.editMatchDate.set(null);
      return;
    }
    this.editMatchDate.set(null);
    this.editMatchDateString = '';
  }

  onDateMaskComplete(): void {
    const value = this.editMatchDateString;
    const parts = value.split(' ');
    if (parts.length < 2) return;
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length < 3 || timeParts.length < 2) return;
    let day: number, month: number;
    if (this.activeLanguage() === 'en') {
      month = parseInt(dateParts[0]) - 1;
      day = parseInt(dateParts[1]);
    } else {
      day = parseInt(dateParts[0]);
      month = parseInt(dateParts[1]) - 1;
    }
    const year = parseInt(dateParts[2]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const date = new Date(year, month, day, hours, minutes);
    if (!isNaN(date.getTime())) {
      this.editMatchDate.set(date);
      this.editMatchDateString = this.formatDateForMask(date);
    }
  }

  clearMatchDate(): void {
    this.editMatchDate.set(null);
    this.editMatchDateString = '';
  }

  // Poules admin methods (same as AdminPoules)
  async onSaveGame(event: SaveGameEvent): Promise<void> {
    const gameData: Omit<Game, 'ref'> = {
      refTeam1: event.refTeam1,
      refTeam2: event.refTeam2,
      scoreTeam1: event.scoreTeam1 ?? undefined,
      scoreTeam2: event.scoreTeam2 ?? undefined,
      date: event.date ?? undefined,
      finished: event.finished ?? false,
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
    if (event.games.length === 0) return;
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
        this.series.update((series) =>
          series.map((s) => (s.ref === event.ref ? { ...s, name: event.name } : s)),
        );
      } else {
        this.series.update((series) => [
          ...series,
          { name: event.name, poules: [], ref: null as unknown as DocumentReference },
        ]);
      }
      return;
    }
    if (event.ref) {
      await this.firebaseService.updateSerieInTournament(event.ref, event.name);
    } else {
      await this.firebaseService.addSeriesToTournament(tournamentRef, event.name);
    }
  }

  async onDeleteSerie(serie: Serie): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) {
      this.series.update((series) => series.filter((s) => s.ref !== serie.ref));
      return;
    }
    await this.firebaseService.deleteSerieFromTournament(serie.ref);
  }

  async onSavePoule(event: SavePouleEvent): Promise<void> {
    if (event.ref) {
      await this.firebaseService.updatePouleInSerie(event.ref, event.name);
    } else {
      await this.firebaseService.addPouleToSerie(event.serieRef, event.name);
    }
  }

  async onDeletePoule(event: DeletePouleEvent): Promise<void> {
    await this.firebaseService.deletePouleFromSerie(event.poule.ref);
  }

  async onAddTeamToPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
  }

  async onRemoveTeamFromPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
  }

  async onSaveTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      if (team.ref) {
        this.teams.update((teams) => teams.map((t) => (t.ref === team.ref ? team : t)));
      } else {
        this.teams.update((teams) => [...teams, { ...team, ref: null! }]);
      }
      return;
    }
    if (team.ref) {
      await this.firebaseService.updateTeamInTournament(ref, team);
    } else {
      await this.firebaseService.addTeamToTournament(ref, team.name);
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
      return;
    }
    for (const team of teams) {
      await this.firebaseService.addTeamToTournament(ref, team.name);
    }
    this.teams.set(await this.loadTeams(this.tournament().ref));
  }

  async onDeleteTeam(team: Team): Promise<void> {
    const ref = this.tournament().ref;
    if (!ref) {
      this.teams.update((teams) => teams.filter((t) => t.ref.id !== team.ref.id));
      return;
    }
    await this.firebaseService.deleteTeamFromTournament(ref, team.ref.id);
    this.teams.set(await this.loadTeams(this.tournament().ref));
  }
}

