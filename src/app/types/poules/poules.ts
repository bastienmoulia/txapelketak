import { Component, input } from '@angular/core';
import { Tournament } from '../../home/tournament.interface';

@Component({
  selector: 'app-poules',
  imports: [],
  templateUrl: './poules.html',
  styleUrl: './poules.css',
})
export class Poules {
  tournament = input.required<Tournament>();
}
