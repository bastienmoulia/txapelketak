import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

interface Tournament {
  id: number;
  name: string;
  url: string;
}

@Component({
  selector: "app-home",
  imports: [RouterLink],
  templateUrl: "./home.html",
  styleUrl: "./home.css",
})
export class Home {
  tournaments = signal<Tournament[]>([
    { id: 1, name: "Championships", url: "/championships" },
  ]);
}
