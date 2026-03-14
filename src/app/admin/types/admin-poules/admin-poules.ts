import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PoulesData } from '../../../tournaments/types/poules/poules';

@Component({
  selector: 'app-admin-poules',
  imports: [],
  templateUrl: './admin-poules.html',
  styleUrl: './admin-poules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPoules {
  tournamentData = input.required<PoulesData>();
}
