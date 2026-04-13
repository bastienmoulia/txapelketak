import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { TournamentStatus } from '../../home/tournament.interface';

@Pipe({
  name: 'tournamentStatusLabel',
  standalone: true,
  pure: false,
})
export class TournamentStatusLabelPipe implements PipeTransform {
  private translocoService = inject(TranslocoService);

  transform(status: TournamentStatus): string {
    switch (status) {
      case 'ongoing':
        return this.translocoService.translate('shared.status.ongoing');
      case 'archived':
        return this.translocoService.translate('shared.status.archived');
      case 'waitingValidation':
        return this.translocoService.translate('shared.status.waitingValidation');
      default:
        return status;
    }
  }
}
