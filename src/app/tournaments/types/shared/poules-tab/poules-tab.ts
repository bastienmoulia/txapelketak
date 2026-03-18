import { Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { Team } from '../teams/teams';
import { Serie } from '../../poules/poules';
import { NgTemplateOutlet } from '@angular/common';
import { ApplyPipe } from 'ngxtension/call-apply';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { TranslocoPipe } from '@jsverse/transloco';
import { Message } from 'primeng/message';

@Component({
  selector: 'app-poules-tab',
  imports: [CardModule, NgTemplateOutlet, ApplyPipe, Button, TranslocoPipe, Message],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  admin = input(false);

  getTeamName(ref: DocumentReference, teams: Team[]): string {
    if (!ref) {
      return 'Unknown Team';
    }
    const team = teams.find((t) => t.ref.id === ref.id);
    return team ? team.name : 'Unknown Team';
  }
}
