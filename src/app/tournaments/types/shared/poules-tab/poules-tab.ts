import { Component, effect, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Team } from '../teams/teams';
import { Serie } from '../../poules/poules';
import { JsonPipe } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';

@Component({
  selector: 'app-poules-tab',
  imports: [CardModule, JsonPipe, ApplyPipe],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();

  getTeamName(ref: DocumentReference, teams: Team[]): string {
    if (!ref) {
      return 'Unknown Team';
    }
    const team = teams.find((t) => t.ref.id === ref.id);
    return team ? team.name : 'Unknown Team';
  }
}
