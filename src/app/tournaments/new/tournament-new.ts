import {
  Component,
  EnvironmentInjector,
  computed,
  inject,
  runInInjectionContext,
  signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from "@angular/forms";
import {
  Firestore,
  addDoc,
  collection,
} from "@angular/fire/firestore";
import { RouterLink } from "@angular/router";
import { Steps } from "primeng/steps";
import { InputText } from "primeng/inputtext";
import { Textarea } from "primeng/textarea";
import { SelectButton } from "primeng/selectbutton";
import { Button } from "primeng/button";
import { FloatLabel } from "primeng/floatlabel";
import { MessageModule } from "primeng/message";
import { startWith } from "rxjs";
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
    Button,
    FloatLabel,
    MessageModule,
    Header,
  ],
  templateUrl: "./tournament-new.html",
  styleUrl: "./tournament-new.css",
})
export class TournamentNew {
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);

  currentStep = signal(0);

  steps = [
    { label: "Informations" },
    { label: "Équipes / Groupes" },
    { label: "Créateur" },
  ];

  typeOptions: { label: string; value: TournamentType }[] = [
    { label: "Poules", value: "poules" },
    { label: "Phase finale", value: "finale" },
    { label: "Poules + Phase finale", value: "poules+finale" },
  ];

  form = new FormGroup({
    name: new FormControl("", [Validators.required]),
    description: new FormControl(""),
    type: new FormControl<TournamentType>("poules", [Validators.required]),
    creatorUsername: new FormControl("", [Validators.required]),
    creatorEmail: new FormControl("", [Validators.required, Validators.email]),
  });

  submitted = signal(false);
  createdManageUrl = signal("");

  teamInput = signal("");
  teams: string[] = [];

  groupInput = signal("");
  groups: string[] = [];

  private formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  isStep1Valid = computed(() => {
    this.formValue();
    return this.form.controls.name.valid;
  });

  isStep3Valid = computed(() => {
    this.formValue();
    return (
      this.form.controls.creatorUsername.valid &&
      this.form.controls.creatorEmail.valid
    );
  });

  addTeam(name: string): void {
    const trimmed = name.trim();
    if (trimmed && !this.teams.includes(trimmed)) {
      this.teams = [...this.teams, trimmed];
    }
    this.teamInput.set("");
  }

  removeTeam(name: string): void {
    this.teams = this.teams.filter((t) => t !== name);
  }

  addGroup(name: string): void {
    const trimmed = name.trim();
    if (trimmed && !this.groups.includes(trimmed)) {
      this.groups = [...this.groups, trimmed];
    }
    this.groupInput.set("");
  }

  removeGroup(name: string): void {
    this.groups = this.groups.filter((g) => g !== name);
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
      const value = this.form.value;
      const tournamentName = (value.name ?? "").trim();
      const creatorEmail = (value.creatorEmail ?? "").trim();
      const manageToken = crypto.randomUUID();
      const tournamentId = crypto.randomUUID();

      const manageUrl = `/tournaments/${tournamentId}/manage`;
      this.createdManageUrl.set(manageUrl);
      this.submitted.set(true);

      const tournament = {
        id: tournamentId,
        name: tournamentName,
        description: value.description ?? "",
        type: value.type as TournamentType,
        status: "waitingValidation" as const,
        creatorUsername: value.creatorUsername,
        creatorEmail,
        manageToken,
        createdAt: new Date().toISOString(),
        teams: this.teams,
        groups: this.groups,
      };

      if (this.firestore) {
        const fs = this.firestore;
        const injector = this.environmentInjector;
        runInInjectionContext(injector, async () => {
          const tournamentsCollection = collection(fs, "tournaments");
          await addDoc(tournamentsCollection, tournament);

          const manageFullUrl = `${window.location.origin}${manageUrl}/${manageToken}`;
          await addDoc(collection(fs, "mail"), {
            to: creatorEmail,
            message: {
              subject: `Acces organisateur - ${tournamentName}`,
              html: `
                <p>Bonjour,</p>
                <p>Votre tournoi <strong>${tournamentName}</strong> a ete cree.</p>
                <p>Voici votre lien d'organisation :</p>
                <p><a href="${manageFullUrl}">${manageFullUrl}</a></p>
                <p>Conservez ce lien de maniere privee.</p>
              `,
            },
          });
        }).catch((err) => console.error("Firestore save failed:", err));
      }
    }
  }
}
