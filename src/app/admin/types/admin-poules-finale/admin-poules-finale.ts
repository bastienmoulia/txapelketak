import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../../home/tournament.interface';

@Component({
  selector: 'app-admin-poules-finale',
  imports: [],
  templateUrl: './admin-poules-finale.html',
  styleUrl: './admin-poules-finale.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoulesFinale {
  tournamentData = input.required<any>();
}
