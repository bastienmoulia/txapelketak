import { Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";

interface Tournament {
  id: number;
  name: string;
  description: string;
  type: "poules" | "finale" | "poules+finale";
  status: "upcoming" | "ongoing" | "completed" | "archived";
  playerCount: number;
  startDate: string;
  url: string;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: "app-home",
  imports: [RouterLink, ButtonModule, CardModule, TableModule, TagModule],
  templateUrl: "./home.html",
  styleUrl: "./home.css",
})
export class Home {
  tournaments = signal<Tournament[]>([
    {
      id: 1,
      name: "Championnat de Pelote 2025",
      description: "Tournoi annuel de pelote basque",
      type: "poules+finale",
      status: "ongoing",
      playerCount: 16,
      startDate: "2025-03-01",
      url: "/tournaments/1",
    },
    {
      id: 2,
      name: "Coupe de Printemps",
      description: "Tournoi de printemps ouvert à tous",
      type: "finale",
      status: "upcoming",
      playerCount: 8,
      startDate: "2025-04-15",
      url: "/tournaments/2",
    },
    {
      id: 3,
      name: "Masters 2024",
      description: "Tournoi des masters annuel",
      type: "poules+finale",
      status: "completed",
      playerCount: 12,
      startDate: "2024-10-05",
      url: "/tournaments/3",
    },
  ]);

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
  ]);

  statusSeverity(
    status: string,
  ): "success" | "info" | "secondary" | "warn" | "danger" | "contrast" {
    switch (status) {
      case "ongoing":
        return "success";
      case "upcoming":
        return "info";
      case "completed":
        return "secondary";
      default:
        return "warn";
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case "ongoing":
        return "En cours";
      case "upcoming":
        return "À venir";
      case "completed":
        return "Terminé";
      case "archived":
        return "Archivé";
      default:
        return status;
    }
  }
}
