import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { KnockoutMatch, KnockoutRound } from '../../finale/finale.model';

@Component({
  selector: 'app-knockout-bracket',
  imports: [TranslocoPipe],
  templateUrl: './knockout-bracket.html',
  styleUrl: './knockout-bracket.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KnockoutBracket {
  rounds = input.required<KnockoutRound[]>();

  totalRounds = computed(() => this.rounds().length);

  getWinnerTeam(match: KnockoutMatch): 'team1' | 'team2' | null {
    if (!match.finished) return null;
    if (match.scoreTeam1 == null || match.scoreTeam2 == null) return null;
    if (match.scoreTeam1 > match.scoreTeam2) return 'team1';
    if (match.scoreTeam2 > match.scoreTeam1) return 'team2';
    return null;
  }
}
