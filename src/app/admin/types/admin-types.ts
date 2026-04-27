import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { Tournament, User } from '../../home/tournament.interface';
import { AdminPoules } from './admin-poules/admin-poules';

@Component({
  selector: 'app-admin-types',
  imports: [AdminPoules, TranslocoModule],
  templateUrl: './admin-types.html',
  styleUrl: './admin-types.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTypes {
  tournament = input.required<Tournament>();
  currentUser = input<User | null>(null);
}
