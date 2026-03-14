import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PoulesFinaleData } from '../../../tournaments/types/poules-finale/poules-finale';

@Component({
  selector: 'app-admin-poules-finale',
  imports: [],
  templateUrl: './admin-poules-finale.html',
  styleUrl: './admin-poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoulesFinale {
  tournamentData = input.required<PoulesFinaleData>();
}
