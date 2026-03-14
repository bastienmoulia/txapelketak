import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FinaleData } from '../../../tournaments/types/finale/finale';

@Component({
  selector: 'app-admin-finale',
  imports: [],
  templateUrl: './admin-finale.html',
  styleUrl: './admin-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminFinale {
  tournamentData = input.required<FinaleData>();
}
