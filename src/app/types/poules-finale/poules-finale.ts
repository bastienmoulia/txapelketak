import { Component, input } from '@angular/core';
import { Tournament } from '../../home/tournament.interface';

@Component({
  selector: 'app-poules-finale',
  imports: [],
  templateUrl: './poules-finale.html',
  styleUrl: './poules-finale.css',
})
export class PoulesFinale {
  tournament = input.required<Tournament>();
}
