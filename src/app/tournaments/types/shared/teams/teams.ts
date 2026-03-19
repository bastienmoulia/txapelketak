import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DocumentReference } from '@firebase/firestore';
import { TranslocoModule } from '@jsverse/transloco';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';

export interface Team {
  ref: DocumentReference;
  name: string;
  serieName?: string;
  pouleName?: string;
}

@Component({
  selector: 'app-teams',
  imports: [TableModule, TranslocoModule, MessageModule],
  templateUrl: './teams.html',
  styleUrl: './teams.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Teams {
  teams = input.required<Team[]>();
}
