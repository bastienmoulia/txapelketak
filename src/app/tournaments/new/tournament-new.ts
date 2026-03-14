import {
  Component,
  EnvironmentInjector,
  computed,
  inject,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import {
  Firestore,
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { RouterLink } from '@angular/router';
import { Steps } from 'primeng/steps';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { startWith } from 'rxjs';
import { Tournament, TournamentType, User } from '../../home/tournament.interface';

import { Header } from '../../shared/header/header';

@Component({
  selector: 'app-tournament-new',
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
  templateUrl: './tournament-new.html',
  styleUrl: './tournament-new.css',
})
export class TournamentNew {
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);

  currentStep = signal(0);

  steps = [{ label: 'Informations' }, { label: 'Équipes & Groupes' }, { label: 'Créateur' }];

  typeOptions: { label: string; value: TournamentType }[] = [
    { label: 'Poules', value: 'poules' },
    { label: 'Phase finale', value: 'finale' },
    { label: 'Poules + Phase finale', value: 'poules_finale' },
  ];

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl<TournamentType>('poules', [Validators.required]),
    creatorUsername: new FormControl('', [Validators.required]),
    creatorEmail: new FormControl('', [Validators.required, Validators.email]),
  });

  submitted = signal(false);
  createdManageUrl = signal('');

  teamInput = signal('');
  teams: string[] = [];

  groups: string[] = [];

  private formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  isStep1Valid = computed(() => {
    this.formValue();
    return this.form.controls.name.valid;
  });

  isStep2Valid = computed(() => true);

  isStep3Valid = computed(() => {
    this.formValue();
    return this.form.controls.creatorUsername.valid && this.form.controls.creatorEmail.valid;
  });

  addTeam(name: string): void {
    if (!this.teams.includes(name)) {
      this.teams = [...this.teams, name];
    }
  }

  removeTeam(name: string): void {
    this.teams = this.teams.filter((t) => t !== name);
  }

  addGroup(name: string): void {
    if (!this.groups.includes(name)) {
      this.groups = [...this.groups, name];
    }
  }

  removeGroup(name: string): void {
    this.groups = this.groups.filter((g) => g !== name);
  }

  nextStep(): void {
    const step = this.currentStep();
    if (step === 0 && !this.isStep1Valid()) {
      this.form.get('name')?.markAsTouched();
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
    this.form.get('creatorUsername')?.markAsTouched();
    this.form.get('creatorEmail')?.markAsTouched();

    if (this.form.valid) {
      const value = this.form.value;
      const tournamentName = (value.name ?? '').trim();
      const creatorUsername = (value.creatorUsername ?? '').trim();
      const creatorEmail = (value.creatorEmail ?? '').trim();

      const tournamentId = Date.now();
      const manageToken = crypto.randomUUID();

      this.createdManageUrl.set(`/tournaments/${tournamentId}/manage`);
      this.submitted.set(true);

      if (this.firestore) {
        void this.persistToFirestore(
          tournamentId,
          tournamentName,
          creatorUsername,
          creatorEmail,
          manageToken,
          value.description ?? '',
          value.type as TournamentType,
        );
      }
    }
  }

  private async persistToFirestore(
    tournamentId: number,
    tournamentName: string,
    creatorUsername: string,
    creatorEmail: string,
    manageToken: string,
    description: string,
    type: TournamentType,
  ): Promise<void> {
    const firestore = this.firestore!;
    const tournamentsCollection = collection(firestore, 'tournaments');
    const usersCollection = collection(firestore, 'users');

    try {
      const latestTournamentQuery = query(
        tournamentsCollection,
        orderBy('id', 'desc'),
        limit(1),
      );
      const latestTournamentSnapshot = await runInInjectionContext(
        this.environmentInjector,
        () => getDocs(latestTournamentQuery),
      );
      const latestTournament = latestTournamentSnapshot.docs[0]?.data() as { id?: number };
      const nextId =
        typeof latestTournament?.id === 'number' ? latestTournament.id + 1 : tournamentId;

      const tournament: Tournament = {
        id: nextId,
        name: tournamentName,
        description,
        type,
        status: 'waitingValidation' as const,
        createdAt: new Date().toISOString(),
      };
      const user: User = {
        tournamentId: nextId,
        username: creatorUsername,
        email: creatorEmail,
        token: manageToken,
        rights: ['admin'],
      };

      await runInInjectionContext(this.environmentInjector, async () => {
        await addDoc(tournamentsCollection, tournament);
        await addDoc(usersCollection, user);
      });

      const adminUrl = `${window.location.origin}/tournaments/${nextId}/${manageToken}`;

      await runInInjectionContext(this.environmentInjector, async () => {
        await addDoc(collection(firestore, 'mail'), {
          to: creatorEmail,
          message: {
            subject: `Accès admin - ${tournamentName}`,
            html: `
              <p>Bonjour ${creatorUsername},</p>
              <p>Votre tournoi <strong>${tournamentName}</strong> a été créé.</p>
              <p>Voici votre lien d'administration :</p>
              <p><a href="${adminUrl}">${adminUrl}</a></p>
              <p>Conservez ce lien de manière privée.</p>
            `,
          },
        });
      });
    } catch (error) {
      console.error('Failed to persist tournament to Firestore', error);
    }
  }
}
