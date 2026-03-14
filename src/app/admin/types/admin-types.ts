import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tournament } from '../../home/tournament.interface';
import { AdminFinale } from './admin-finale/admin-finale';
import { AdminPoules } from './admin-poules/admin-poules';
import { AdminPoulesFinale } from './admin-poules-finale/admin-poules-finale';

@Component({
  selector: 'app-admin-types',
  imports: [AdminFinale, AdminPoules, AdminPoulesFinale],
  templateUrl: './admin-types.html',
  styleUrl: './admin-types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTypes {
  tournament = input.required<Tournament>();
}
