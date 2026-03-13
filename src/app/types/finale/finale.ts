import { Component, input } from '@angular/core';
import { Tournament } from '../../home/tournament.interface';

@Component({
  selector: 'app-finale',
  imports: [],
  templateUrl: './finale.html',
  styleUrl: './finale.css',
})
export class Finale {
  tournament = input.required<Tournament>();
}
