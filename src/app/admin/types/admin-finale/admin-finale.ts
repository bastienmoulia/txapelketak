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
import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Tournament, User } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import { DocumentReference } from '@angular/fire/firestore';
import {
  FinaleData,
  KnockoutMatch,
  KnockoutRound,
  buildKnockoutRounds,
  generateKnockoutBracket,
  parseKnockoutMatch,
} from '../../../tournaments/types/finale/finale.model';
import { ToastModule } from 'primeng/toast';
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
import { AdminUsers } from '../shared/admin-users/admin-users';

const FINALE_ROUTE_TABS = ['bracket', 'users'] as const;
type FinaleRouteTab = (typeof FINALE_ROUTE_TABS)[number];
const FINALE_TAB_QUERY_PARAM = 'tab';

const TEAM_SIZES = [2, 4, 8, 16, 32];

@Component({
  selector: 'app-admin-finale',
  imports: [
    TranslocoModule,
    TabsModule,
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
    AdminUsers,
  ],
  templateUrl: './admin-finale.html',
  styleUrl: './admin-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MessageService],
})
export class AdminFinale {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();
  currentUser = input<User | null>(null);

  role = computed(() => this.currentUser()?.role ?? '');

  finaleData = computed(() => (this.tournament().data as FinaleData) ?? {});
  numberOfTeams = signal<number>(8);
  teamSizes = TEAM_SIZES;

  knockoutMatches = signal<KnockoutMatch[]>([]);

  private loadedTournamentId = signal<string | null>(null);

  activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  datePlaceholder = computed(() => {
    this.activeLanguage();
    return this.translocoService.translate('datepicker.placeholder');
  });

  firstDayOfWeek = computed(() => {
    this.activeLanguage();
    return Number(this.translocoService.translate('datepicker.firstDayOfWeek'));
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

  private tabFromUrl = toSignal(
    this.activatedRoute.queryParamMap.pipe(
      map((queryParams) => {
        const v = queryParams.get(FINALE_TAB_QUERY_PARAM);
        return (FINALE_ROUTE_TABS.includes(v as FinaleRouteTab) ? v : 'bracket') as FinaleRouteTab;
      }),
    ),
    { initialValue: 'bracket' as FinaleRouteTab },
  );

  activeTab = computed(() => this.tabFromUrl());

  // Edit match dialog state
  matchDialogVisible = signal(false);
  isEditingMatch = signal(false);
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
      await this.loadKnockoutMatches(tournament.ref);
      this.watchKnockoutMatches(tournament.ref);
    });
  }

  onTabChange(nextTab: string | number | undefined): void {
    if (typeof nextTab !== 'string') return;
    if (nextTab === this.activeTab()) return;
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { [FINALE_TAB_QUERY_PARAM]: nextTab },
      queryParamsHandling: 'merge',
    });
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

  async onSaveNumberOfTeams(): Promise<void> {
    const tournamentRef = this.tournament().ref;
    if (!tournamentRef) return;
    await this.firebaseService.updateTournamentData(tournamentRef, {
      'data.numberOfTeams': this.numberOfTeams(),
    });
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.finale.saved'),
      detail: this.translocoService.translate('admin.finale.savedDetail'),
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

    // Delete existing knockout matches
    await this.firebaseService.deleteAllKnockoutMatches(tournamentRef);

    // Create new matches
    await Promise.all(
      matches.map((match) => this.firebaseService.addKnockoutMatch(tournamentRef, match)),
    );

    // Save numberOfTeams to tournament data
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
    this.isEditingMatch.set(true);
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
}

