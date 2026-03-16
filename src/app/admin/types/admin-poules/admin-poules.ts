import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { TabsModule } from 'primeng/tabs';
import { PoulesData } from '../../../tournaments/types/poules/poules';
import { AdminTeams } from '../shared/admin-teams/admin-teams';

@Component({
  selector: 'app-admin-poules',
  imports: [TabsModule, AdminTeams, TranslocoModule],
  templateUrl: './admin-poules.html',
  styleUrl: './admin-poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoules {
  tournamentData = input.required<PoulesData>();
}
