import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tournament } from '../../home/tournament.interface';
import { Finale, FinaleData } from './finale/finale';
import { Poules, PoulesData } from './poules/poules';
import { PoulesFinale, PoulesFinaleData } from './poules-finale/poules-finale';

@Component({
  selector: 'app-types',
  imports: [Finale, Poules, PoulesFinale, TranslocoModule],
  templateUrl: './types.html',
  styleUrl: './types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Types {
  tournament = input.required<Tournament>();

  poulesData = computed(() => this.tournament().data as PoulesData);
  finaleData = computed(() => this.tournament().data as FinaleData);
  poulesFinaleData = computed(() => this.tournament().data as PoulesFinaleData);
}
