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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { DocumentReference } from '@angular/fire/firestore';
import { Tournament } from '../../../home/tournament.interface';
import { FirebaseService } from '../../../shared/services/firebase.service';
import {
  FinaleData,
  KnockoutMatch,
  KnockoutRound,
  buildKnockoutRounds,
  parseKnockoutMatch,
} from './finale.model';
import { KnockoutBracket } from '../shared/knockout-bracket/knockout-bracket';

export type { FinaleData, KnockoutMatch, KnockoutRound } from './finale.model';
export { buildKnockoutRounds, generateKnockoutBracket, getRoundName, parseKnockoutMatch } from './finale.model';

@Component({
  selector: 'app-finale',
  imports: [TranslocoModule, KnockoutBracket],
  templateUrl: './finale.html',
  styleUrl: './finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Finale {
  private firebaseService = inject(FirebaseService);
  private translocoService = inject(TranslocoService);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();

  knockoutMatches = signal<KnockoutMatch[]>([]);
  private loadedTournamentId = signal<string | null>(null);

  finaleData = computed(() => (this.tournament().data as FinaleData) ?? {});

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
      await this.loadKnockoutMatches(tournament.ref);
      this.watchKnockoutMatches(tournament.ref);
    });
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
