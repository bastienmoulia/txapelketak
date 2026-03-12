import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Firestore, collection, collectionData } from "@angular/fire/firestore";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { CallPipe } from "ngxtension/call-apply";
import { Tournament } from "../../home/tournament.interface";
import { Header } from "../../header/header";
import { TournamentStatusLabelPipe } from "../../shared/pipes/tournament-status-label.pipe";
import { TournamentStatusSeverityPipe } from "../../shared/pipes/tournament-status-severity.pipe";

@Component({
  selector: "app-tournament-list",
  imports: [
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    CallPipe,
    Header,
    TournamentStatusLabelPipe,
    TournamentStatusSeverityPipe,
  ],
  templateUrl: "./tournament-list.html",
  styleUrl: "./tournament-list.css",
})
export class TournamentList {
  firestore = inject(Firestore, { optional: true });
  tournaments = signal<Tournament[]>([]);

  constructor() {
    if (this.firestore) {
      const tournamentsCollection = collection(this.firestore, "tournaments");
      collectionData(tournamentsCollection)
        .pipe(takeUntilDestroyed())
        .subscribe((data) => {
          this.tournaments.set(data as Tournament[]);
        });
    }
  }

  getTournamentLink(tournament: Tournament): string {
    return `/${tournament.id}`;
  }
}
