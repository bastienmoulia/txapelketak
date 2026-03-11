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
  getDocs,
  limit,
  orderBy,
  query,
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
  firestore = inject(Firestore);
  environmentInjector = inject(EnvironmentInjector);

  currentStep = signal(0);

  steps = [{ label: "Informations" }, { label: "Créateur" }];

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

  private formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  isStep1Valid = computed(() => {
    this.formValue();
    return this.form.controls.name.valid;
  });

  isStep2Valid = computed(() => {
    this.formValue();
    return (
      this.form.controls.creatorUsername.valid &&
      this.form.controls.creatorEmail.valid
    );
  });

  private tournamentsCollection = collection(this.firestore, "tournaments");

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

  async onSubmit(): Promise<void> {
    this.form.get("creatorUsername")?.markAsTouched();
    this.form.get("creatorEmail")?.markAsTouched();

    if (this.form.valid) {
      const value = this.form.value;
      const tournamentName = (value.name ?? "").trim();
      const creatorEmail = (value.creatorEmail ?? "").trim();

      const tournamentId = await runInInjectionContext(
        this.environmentInjector,
        async () => {
          const latestTournamentQuery = query(
            this.tournamentsCollection,
            orderBy("id", "desc"),
            limit(1),
          );
          const latestTournamentSnapshot = await getDocs(latestTournamentQuery);
          const latestTournament = latestTournamentSnapshot.docs[0]?.data() as {
            id?: number;
          };
          const latestTournamentId =
            typeof latestTournament?.id === "number" ? latestTournament.id : 0;

          return latestTournamentId + 1;
        },
      );

      const tournament = {
        id: tournamentId,
        name: tournamentName,
        description: value.description ?? "",
        type: value.type as TournamentType,
        status: "waitingValidation" as const,
        creatorUsername: value.creatorUsername,
        creatorEmail,
        creatorAdminToken: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      await runInInjectionContext(this.environmentInjector, async () => {
        await addDoc(this.tournamentsCollection, tournament);
      });

      const adminUrl = `${window.location.origin}/tournaments/${tournament.id}/admin/${tournament.creatorAdminToken}`;

      // Write to 'mail' collection for Firebase Extension to send email
      await runInInjectionContext(this.environmentInjector, async () => {
        await addDoc(collection(this.firestore, "mail"), {
          to: creatorEmail,
          message: {
            subject: `Acces admin - ${tournamentName}`,
            html: `
              <p>Bonjour,</p>
              <p>Votre tournoi <strong>${tournamentName}</strong> a ete cree.</p>
              <p>Voici votre lien d'administration :</p>
              <p><a href="${adminUrl}">${adminUrl}</a></p>
              <p>Conservez ce lien de maniere privee.</p>
            `,
          },
        });
      });

      this.submitted.set(true);
    }
  }
}
