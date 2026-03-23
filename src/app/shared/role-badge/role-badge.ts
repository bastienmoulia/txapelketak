import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BadgeModule } from 'primeng/badge';
import { UserRole } from '../../home/tournament.interface';

@Component({
  selector: 'app-role-badge',
  imports: [BadgeModule, TranslocoPipe],
  templateUrl: './role-badge.html',
  styleUrl: './role-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleBadge {
  role = input<UserRole | ''>('');
}
