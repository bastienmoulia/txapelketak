import { Pipe, PipeTransform } from "@angular/core";
import { TournamentStatus } from "../../home/tournament.interface";

@Pipe({
  name: "tournamentStatusSeverity",
  standalone: true,
})
export class TournamentStatusSeverityPipe implements PipeTransform {
  transform(
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
}
