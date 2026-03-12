import { Component, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Firestore, collection, collectionData } from "@angular/fire/firestore";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { CallPipe } from "ngxtension/call-apply";
import { Tournament, TournamentStatus } from "../../home/tournament.interface";

@Component({
  selector: "app-tournament-list",
  imports: [RouterLink, ButtonModule, TableModule, TagModule, CallPipe],
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

  statusSeverity(
    status: TournamentStatus,
  ): "success" | "info" | "secondary" | "warn" | "danger" | "contrast" {
    switch (status) {
      case "ongoing":
        return "success";
      case "upcoming":
        return "info";
      case "completed":
        return "secondary";
      case "waitingValidation":
        return "warn";
      case "archived":
        return "danger";
      default:
        return "warn";
    }
  }

  statusLabel(status: TournamentStatus): string {
    switch (status) {
      case "ongoing":
        return "En cours";
      case "upcoming":
        return "À venir";
      case "completed":
        return "Terminé";
      case "archived":
        return "Archivé";
      case "waitingValidation":
        return "En attente de validation";
      default:
        return status;
    }
  }

  getTournamentLink(tournament: Tournament): string {
    return `/${tournament.id}`;
  }
}
