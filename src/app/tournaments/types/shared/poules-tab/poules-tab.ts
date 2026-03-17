import { Component, input } from '@angular/core';
import { Team } from '../teams/teams';
import { Serie } from '../../poules/poules';

@Component({
  selector: 'app-poules-tab',
  imports: [],
  templateUrl: './poules-tab.html',
  styleUrl: './poules-tab.css',
})
export class PoulesTab {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
}
