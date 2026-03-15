import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tournament } from '../../home/tournament.interface';
import { AdminFinale } from './admin-finale/admin-finale';
import { AdminPoules } from './admin-poules/admin-poules';
import { AdminPoulesFinale } from './admin-poules-finale/admin-poules-finale';
import { PoulesData } from '../../tournaments/types/poules/poules';
import { FinaleData } from '../../tournaments/types/finale/finale';
import { PoulesFinaleData } from '../../tournaments/types/poules-finale/poules-finale';

@Component({
  selector: 'app-admin-types',
  imports: [AdminFinale, AdminPoules, AdminPoulesFinale, TranslocoModule],
  templateUrl: './admin-types.html',
  styleUrl: './admin-types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTypes {
  tournament = input.required<Tournament>();

  poulesData = computed(() => this.tournament().data as PoulesData);
  finaleData = computed(() => this.tournament().data as FinaleData);
  poulesFinaleData = computed(() => this.tournament().data as PoulesFinaleData);
}
