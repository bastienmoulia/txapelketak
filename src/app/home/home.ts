import { Component, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Firestore, collection, collectionData } from "@angular/fire/firestore";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";
import { CallPipe } from "ngxtension/call-apply";
import { Tournament, TournamentStatus } from "./tournament.interface";

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: "app-home",
  imports: [
    RouterLink,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    CallPipe,
  ],
  templateUrl: "./home.html",
  styleUrl: "./home.css",
})
export class Home {
  firestore = inject(Firestore, { optional: true });
  tournaments = signal<Tournament[]>([]);

  recentTournaments = computed(() =>
    [...this.tournaments()]
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      })
      .slice(0, 5),
  );

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

  features = signal<Feature[]>([
    {
      icon: "pi pi-trophy",
      title: "Créez votre tournoi",
      description:
        "Configurez facilement vos tournois : poules, phases finales, ou les deux.",
    },
    {
      icon: "pi pi-users",
      title: "Gérez les joueurs",
      description:
        "Ajoutez vos participants et organisez-les en groupes ou en têtes de série.",
    },
    {
      icon: "pi pi-chart-bar",
      title: "Suivez les scores",
      description:
        "Saisissez les résultats en temps réel et consultez les classements mis à jour automatiquement.",
    },
    {
      icon: "pi pi-link",
      title: "Accès par URL",
      description:
        "Partagez votre tournoi simplement avec un lien. Pas d'inscription requise, aucune donnée personnelle.",
    },
    {
      icon: "pi pi-euro",
      title: "100% gratuit",
      description:
        "Créez et organisez autant de tournois que vous le souhaitez, complètement gratuitement.",
    },
    {
      icon: "pi pi-code",
      title: "Libre et open source",
      description:
        "Code source ouvert, aucune publicité, aucune limitation. À vous de jouer.",
    },
  ]);

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
