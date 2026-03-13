import {
  Component,
  EnvironmentInjector,
  inject,
  runInInjectionContext,
  signal,
  Type,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Firestore, collection, collectionData, addDoc } from '@angular/fire/firestore';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { InputText } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import { Header } from '../../shared/header/header';
import {
  Tournament,
  TournamentStatus,
  Manager,
  TournamentType,
} from '../../home/tournament.interface';
import { Types } from '../../types/types';

@Component({
  selector: 'app-tournament-detail',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonModule,
    CardModule,
    MessageModule,
    TagModule,
    InputText,
    FloatLabel,
    Header,
    Types,
  ],
  templateUrl: './tournament-detail.html',
  styleUrl: './tournament-detail.css',
})
export class TournamentDetail {
  firestore = inject(Firestore, { optional: true });
  environmentInjector = inject(EnvironmentInjector);
  private route = inject(ActivatedRoute);

  tournamentId = signal<string>('');
  tournament = signal<Tournament | null>(null);
  loading = signal(true);
  notFound = signal(false);

  resendEmailControl = new FormControl('', [Validators.required, Validators.email]);
  resendEmailSent = signal(false);
  resendEmailError = signal('');

  newManagerUsername = new FormControl('', [Validators.required]);
  newManagerEmail = new FormControl('', [Validators.required, Validators.email]);
  managerAddError = signal('');
  managerAddSuccess = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.tournamentId.set(id);

    if (this.firestore) {
      const tournamentsCollection = collection(this.firestore, 'tournaments');
      collectionData(tournamentsCollection).subscribe((data) => {
        const all = data as Tournament[];
        const found = all.find((t) => String(t.id) === id);
        if (found) {
          this.tournament.set(found);
        } else {
          this.notFound.set(true);
        }
        this.loading.set(false);
      });
    } else {
      this.loading.set(false);
      this.notFound.set(true);
    }
  }

  statusSeverity(
    status: TournamentStatus,
  ): 'success' | 'info' | 'secondary' | 'warn' | 'danger' | 'contrast' {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'upcoming':
        return 'info';
      case 'completed':
        return 'secondary';
      case 'waitingValidation':
        return 'warn';
      case 'archived':
        return 'danger';
      default:
        return 'warn';
    }
  }

  statusLabel(status: TournamentStatus): string {
    switch (status) {
      case 'ongoing':
        return 'En cours';
      case 'upcoming':
        return 'À venir';
      case 'completed':
        return 'Terminé';
      case 'archived':
        return 'Archivé';
      case 'waitingValidation':
        return 'En attente de validation';
      default:
        return status;
    }
  }

  typeLabel(type: TournamentType): string {
    switch (type) {
      case 'poules':
        return 'Poules';
      case 'finale':
        return 'Phase finale';
      case 'poules_finale':
        return 'Poules + Phase finale';
      default:
        return type;
    }
  }

  onResendEmail(): void {
    this.resendEmailControl.markAsTouched();
    if (this.resendEmailControl.invalid) return;

    const t = this.tournament();
    if (!t || !this.firestore) return;

    const enteredEmail = this.resendEmailControl.value?.trim() ?? '';
    if (enteredEmail !== t.creatorEmail) {
      this.resendEmailError.set("L'adresse email ne correspond pas à celle du créateur.");
      return;
    }

    this.resendEmailError.set('');

    const fs = this.firestore;
    const injector = this.environmentInjector;
    runInInjectionContext(injector, async () => {
      const manageFullUrl = `${window.location.origin}/tournaments/${t.id}/manage/${t.manageToken}`;
      await addDoc(collection(fs, 'mail'), {
        to: enteredEmail,
        message: {
          subject: `Acces organisateur - ${t.name}`,
          html: `
            <p>Bonjour,</p>
            <p>Voici votre lien d'organisation pour le tournoi <strong>${t.name}</strong> :</p>
            <p><a href="${manageFullUrl}">${manageFullUrl}</a></p>
            <p>Conservez ce lien de maniere privee.</p>
          `,
        },
      });
      this.resendEmailSent.set(true);
    }).catch((err) => {
      console.error('Failed to resend email:', err);
      this.resendEmailError.set('Une erreur est survenue. Veuillez réessayer.');
    });
  }

  onAddManager(): void {
    this.newManagerUsername.markAsTouched();
    this.newManagerEmail.markAsTouched();

    if (this.newManagerUsername.invalid || this.newManagerEmail.invalid) return;

    const t = this.tournament();
    if (!t || !this.firestore) return;

    const username = this.newManagerUsername.value?.trim() ?? '';
    const email = this.newManagerEmail.value?.trim() ?? '';

    const newManager: Manager = {
      username,
      email,
      token: crypto.randomUUID(),
    };

    const fs = this.firestore;
    const injector = this.environmentInjector;
    runInInjectionContext(injector, async () => {
      const manageFullUrl = `${window.location.origin}/tournaments/${t.id}/manage/${newManager.token}`;
      await addDoc(collection(fs, 'mail'), {
        to: email,
        message: {
          subject: `Invitation - ${t.name}`,
          html: `
            <p>Bonjour ${username},</p>
            <p>Vous avez été invité à gérer le tournoi <strong>${t.name}</strong>.</p>
            <p>Voici votre lien de gestion :</p>
            <p><a href="${manageFullUrl}">${manageFullUrl}</a></p>
            <p>Conservez ce lien de maniere privee.</p>
          `,
        },
      });
      this.managerAddSuccess.set(true);
      this.newManagerUsername.reset();
      this.newManagerEmail.reset();
    }).catch((err) => {
      console.error('Failed to add manager:', err);
      this.managerAddError.set('Une erreur est survenue. Veuillez réessayer.');
    });
  }
}
