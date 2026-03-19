import { Component, input } from '@angular/core';
import { Serie } from '../../poules/poules';
import { Team } from '../teams/teams';

@Component({
  selector: 'app-scores',
  imports: [],
  templateUrl: './scores.html',
  styleUrl: './scores.css',
})
export class Scores {
  teams = input.required<Team[]>();
  series = input.required<Serie[]>();
  admin = input(false);
}
