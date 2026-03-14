import { Pipe, PipeTransform } from '@angular/core';
import { TournamentStatus } from '../../home/tournament.interface';

@Pipe({
  name: 'tournamentStatusLabel',
  standalone: true,
})
export class TournamentStatusLabelPipe implements PipeTransform {
  transform(status: TournamentStatus): string {
    switch (status) {
      case 'ongoing':
        return 'En cours';
      case 'paused':
        return 'En pause';
      case 'archived':
        return 'Archivé';
      case 'waitingValidation':
        return 'En attente de validation';
      default:
        return status;
    }
  }
}
