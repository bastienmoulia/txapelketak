import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageModule } from 'primeng/message';
import { TournamentDetailStore } from '../../../../store/tournament-detail.store';
import { AuthStore } from '../../../../store/auth.store';
import { PoulesStore } from '../../../../store/poules.store';
import { AdminGeneral } from '../admin-general/admin-general';
import { AdminTimeSlots } from '../admin-time-slots/admin-time-slots';
import { AdminUsers } from '../admin-users/admin-users';
import { AdminImportExport } from '../admin-import-export/admin-import-export';
import { AdminDeleteTournament } from '../admin-delete-tournament/admin-delete-tournament';

@Component({
  selector: 'app-settings',
  imports: [
    TranslocoModule,
    MessageModule,
    AdminGeneral,
    AdminTimeSlots,
    AdminUsers,
    AdminImportExport,
    AdminDeleteTournament,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private tournamentDetailStore = inject(TournamentDetailStore);
  private authStore = inject(AuthStore);
  private poulesStore = inject(PoulesStore);

  role = this.authStore.role;
  tournament = this.tournamentDetailStore.tournament;
  currentUser = this.authStore.currentUser;
  teams = this.poulesStore.teams;
  series = this.poulesStore.series;
  timeSlots = this.poulesStore.timeSlots;
}
