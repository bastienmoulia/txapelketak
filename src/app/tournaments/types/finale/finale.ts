import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input } from '@angular/core';
import { Tournament } from '../../../home/tournament.interface';
import { PoulesStore } from '../../../store/poules.store';
import { FinaleTab } from '../shared/finale-tab/finale-tab';

@Component({
  selector: 'app-finale',
  imports: [FinaleTab],
  templateUrl: './finale.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Finale {
  private poulesStore = inject(PoulesStore);
  private destroyRef = inject(DestroyRef);

  tournament = input.required<Tournament>();

  teams = this.poulesStore.teams;
  series = this.poulesStore.series;

  constructor() {
    this.destroyRef.onDestroy(() => this.poulesStore.stopWatching());
    effect(() => {
      this.poulesStore.startWatching(this.tournament().ref);
    });
  }
}
