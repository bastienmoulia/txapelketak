import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { Steps } from 'primeng/steps';
import { InputText } from 'primeng/inputtext';
import { Editor } from 'primeng/editor';
import { SelectButton } from 'primeng/selectbutton';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { MessageModule } from 'primeng/message';
import { startWith } from 'rxjs';
import { Tournament, TournamentType, User } from '../../home/tournament.interface';
import { FirebaseService } from '../../shared/services/firebase.service';

@Component({
  selector: 'app-tournament-new',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Steps,
    InputText,
    Editor,
    SelectButton,
    Button,
    FloatLabel,
    MessageModule,
    TranslocoModule,
  ],
  templateUrl: './tournament-new.html',
  styleUrl: './tournament-new.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentNew {
  firebaseService = inject(FirebaseService);
  private translocoService = inject(TranslocoService);

  currentStep = signal(0);

  get steps() {
    return [
      { label: this.translocoService.translate('tournaments.new.steps.info') },
      { label: this.translocoService.translate('tournaments.new.steps.creator') },
    ];
  }

  get typeOptions(): { label: string; value: TournamentType }[] {
    return [
      { label: this.translocoService.translate('tournaments.new.type.poules'), value: 'poules' },
      { label: this.translocoService.translate('tournaments.new.type.finale'), value: 'finale' },
      {
        label: this.translocoService.translate('tournaments.new.type.poulesFinale'),
        value: 'poules_finale',
      },
    ];
  }

  form = new FormGroup({
    name: new FormControl('', [Validators.required]),
    description: new FormControl(''),
    type: new FormControl<TournamentType>('poules', [Validators.required]),
    creatorUsername: new FormControl('', [Validators.required]),
    creatorEmail: new FormControl('', [Validators.required, Validators.email]),
  });

  submitted = signal(false);
  adminUrl = signal('');

  private formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  isStep1Valid = computed(() => {
    this.formValue();
    return this.form.controls.name.valid;
  });

  isStep2Valid = computed(() => {
    this.formValue();
    return this.form.controls.creatorUsername.valid && this.form.controls.creatorEmail.valid;
  });

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

  openAdmin(): void {
    const url = this.adminUrl();
    if (!url) {
      return;
    }
    window.location.href = url;
  }

  async onSubmit(): Promise<void> {
    this.form.get('creatorUsername')?.markAsTouched();
    this.form.get('creatorEmail')?.markAsTouched();

    if (this.form.valid) {
      this.submitted.set(true);

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      const value = this.form.value;
      const tournamentName = (value.name ?? '').trim();
      const creatorUsername = (value.creatorUsername ?? '').trim();
      const creatorEmail = (value.creatorEmail ?? '').trim();

      const tournament: Omit<Tournament, 'ref'> = {
        name: tournamentName,
        description: value.description ?? '',
        type: value.type as TournamentType,
        status: 'waitingValidation' as const,
        createdAt: new Date().toISOString(),
      };

      const tournamentRef = await this.firebaseService.createTournament(tournament);

      if (!tournamentRef) {
        return;
      }

      const user: User = {
        refTournament: tournamentRef,
        username: creatorUsername,
        email: creatorEmail,
        token: crypto.randomUUID(),
        role: 'admin',
      };

      await this.firebaseService.createUser(user);

      this.adminUrl.set(`${window.location.origin}/tournaments/${tournamentRef.id}/${user.token}`);

      /*await this.firebaseService.queueMail(
        creatorEmail,
        `Accès admin - ${tournamentName}`,
        `
          <p>Bonjour ${creatorUsername},</p>
          <p>Votre tournoi <strong>${tournamentName}</strong> a été créé.</p>
          <p>Voici votre lien d'administration :</p>
          <p><a href="${adminUrl}">${adminUrl}</a></p>
          <p>Conservez ce lien de manière privée.</p>
        `,
      );*/
    }
  }
}
