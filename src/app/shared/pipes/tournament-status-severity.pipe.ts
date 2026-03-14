import { Pipe, PipeTransform } from '@angular/core';
import { TournamentStatus } from '../../home/tournament.interface';

@Pipe({
  name: 'tournamentStatusSeverity',
  standalone: true,
})
export class TournamentStatusSeverityPipe implements PipeTransform {
  transform(status: TournamentStatus): 'success' | 'info' | 'warn' | 'danger' | null {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'paused':
        return 'warn';
      case 'waitingValidation':
        return 'danger';
      case 'archived':
        return 'info';
      default:
        return null;
    }
  }
}
