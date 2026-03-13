import { Component, input } from '@angular/core';
import { Tournament } from '../home/tournament.interface';
import { Finale } from './finale/finale';
import { Poules } from './poules/poules';
import { PoulesFinale } from './poules-finale/poules-finale';

@Component({
  selector: 'app-types',
  imports: [Finale, Poules, PoulesFinale],
  templateUrl: './types.html',
  styleUrl: './types.css',
})
export class Types {
  tournament = input.required<Tournament>();
}
