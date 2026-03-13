import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../shared/header/header';

@Component({
  selector: 'app-main',
  imports: [RouterOutlet, Header],
  templateUrl: './main.html',
  styleUrl: './main.css',
})
export class Main {}
