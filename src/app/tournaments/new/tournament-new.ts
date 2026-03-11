import { Component, signal } from "@angular/core";
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { Steps } from "primeng/steps";
import { InputText } from "primeng/inputtext";
import { Textarea } from "primeng/textarea";
import { SelectButton } from "primeng/selectbutton";
import { Chip } from "primeng/chip";
import { Button } from "primeng/button";
import { FloatLabel } from "primeng/floatlabel";
import { MessageModule } from "primeng/message";
import { Header } from "../../header/header";

type TournamentType = "poules" | "finale" | "poules+finale";

@Component({
  selector: "app-tournament-new",
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Steps,
    InputText,
    Textarea,
    SelectButton,
    Chip,
    Button,
    FloatLabel,
    MessageModule,
    Header,
  ],
  templateUrl: "./tournament-new.html",
  styleUrl: "./tournament-new.css",
})
export class TournamentNew {
  currentStep = signal(0);

  steps = [
    { label: "Informations" },
    { label: "Configuration" },
    { label: "Créateur" },
  ];

  typeOptions = [
    { label: "Poules", value: "poules" },
    { label: "Phase finale", value: "finale" },
    { label: "Poules + Phase finale", value: "poules+finale" },
  ];

  form = new FormGroup({
    name: new FormControl("", [Validators.required]),
    description: new FormControl(""),
    type: new FormControl<TournamentType>("poules", [Validators.required]),
    teams: new FormControl<string[]>([]),
    groups: new FormControl<string[]>([]),
    creatorUsername: new FormControl("", [Validators.required]),
    creatorEmail: new FormControl("", [Validators.required, Validators.email]),
  });

  teamInput = signal("");
  groupInput = signal("");

  submitted = signal(false);
  createdManageUrl = signal<string | null>(null);
  urlCopied = signal(false);

  copyManageUrl(): void {
    const url = this.createdManageUrl();
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        this.urlCopied.set(true);
        setTimeout(() => this.urlCopied.set(false), 2000);
      });
    }
  }

  get teams(): string[] {
    return this.form.get("teams")?.value ?? [];
  }

  get groups(): string[] {
    return this.form.get("groups")?.value ?? [];
  }

  isStep1Valid(): boolean {
    const nameControl = this.form.get("name");
    return nameControl?.valid ?? false;
  }

  isStep3Valid(): boolean {
    const usernameControl = this.form.get("creatorUsername");
    const emailControl = this.form.get("creatorEmail");
    return (usernameControl?.valid ?? false) && (emailControl?.valid ?? false);
  }

  addTeam(value: string): void {
    const trimmed = value.trim();
    if (trimmed && !this.teams.includes(trimmed)) {
      this.form.get("teams")?.setValue([...this.teams, trimmed]);
      this.teamInput.set("");
    }
  }

  removeTeam(team: string): void {
    this.form.get("teams")?.setValue(this.teams.filter((t) => t !== team));
  }

  addGroup(value: string): void {
    const trimmed = value.trim();
    if (trimmed && !this.groups.includes(trimmed)) {
      this.form.get("groups")?.setValue([...this.groups, trimmed]);
      this.groupInput.set("");
    }
  }

  removeGroup(group: string): void {
    this.form.get("groups")?.setValue(this.groups.filter((g) => g !== group));
  }

  onTeamInputKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.addTeam(this.teamInput());
    }
  }

  onGroupInputKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.addGroup(this.groupInput());
    }
  }

  nextStep(): void {
    const step = this.currentStep();
    if (step === 0 && !this.isStep1Valid()) {
      this.form.get("name")?.markAsTouched();
      return;
    }
    if (step < this.steps.length - 1) {
      this.currentStep.update((s) => s + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update((s) => s - 1);
    }
  }

  onSubmit(): void {
    this.form.get("creatorUsername")?.markAsTouched();
    this.form.get("creatorEmail")?.markAsTouched();

    if (this.form.valid) {
      const manageToken = crypto.randomUUID();
      const viewToken = crypto.randomUUID();
      const value = this.form.value;
      const tournament = {
        id: manageToken,
        name: value.name,
        description: value.description ?? "",
        type: value.type as TournamentType,
        teams: value.teams ?? [],
        groups: value.groups ?? [],
        creatorUsername: value.creatorUsername,
        creatorEmail: value.creatorEmail,
        createdAt: new Date().toISOString(),
        manageUrl: `/tournaments/${manageToken}/manage`,
        viewUrl: `/tournaments/${viewToken}/view`,
      };
      this.createdManageUrl.set(tournament.manageUrl);
      this.submitted.set(true);
    }
  }
}
