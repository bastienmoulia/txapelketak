import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { Tournament, User } from '../../../../home/tournament.interface';
import { DocumentReference } from '@angular/fire/firestore';

@Component({
  selector: 'app-admin-users',
  imports: [
    ButtonModule,
    DialogModule,
    FloatLabel,
    FormsModule,
    InputTextModule,
    MessageModule,
    Select,
    TableModule,
    TagModule,
    TranslocoModule,
  ],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private firebaseService = inject(FirebaseService);
  private translocoService = inject(TranslocoService);

  tournament = input.required<Tournament>();
  users = signal<User[]>([]);

  private loadedTournamentId = signal<string | null>(null);
  private activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  roleOptions = computed(() => {
    this.activeLanguage();
    return [
      { value: 'admin', label: this.translocoService.translate('admin.users.role.admin') },
      {
        value: 'organizer',
        label: this.translocoService.translate('admin.users.role.organizer'),
      },
    ];
  });

  // Dialog state
  dialogVisible = signal(false);
  isEditing = signal(false);
  editingRef = signal<DocumentReference | null>(null);
  username = signal('');
  email = signal('');
  selectedRole = signal<string>('');

  // Delete confirm
  deleteConfirmVisible = signal(false);
  pendingDeleteUser = signal<User | null>(null);

  constructor() {
    effect(async () => {
      const tournament = this.tournament();

      if (!this.firebaseService.isAvailable()) {
        return;
      }

      if (this.loadedTournamentId() === tournament.ref.id) {
        return;
      }

      this.loadedTournamentId.set(tournament.ref.id);
      this.users.set(await this.firebaseService.getUsersByTournament(tournament.ref));
    });
  }

  onAddUser(): void {
    this.isEditing.set(false);
    this.editingRef.set(null);
    this.username.set('');
    this.email.set('');
    this.selectedRole.set('');
    this.dialogVisible.set(true);
  }

  onEditUser(user: User): void {
    this.isEditing.set(true);
    this.editingRef.set(user.ref ?? null);
    this.username.set(user.username);
    this.email.set(user.email);
    this.selectedRole.set(user.role);
    this.dialogVisible.set(true);
  }

  async onSaveUser(): Promise<void> {
    if (!this.username() || !this.email() || !this.selectedRole()) {
      return;
    }

    const ref = this.editingRef();
    if (this.isEditing() && ref) {
      await this.firebaseService.updateUser(ref, {
        username: this.username(),
        email: this.email(),
        role: this.selectedRole(),
      });
      this.users.update((list) =>
        list.map((u) =>
          u.ref?.id === ref.id
            ? {
                ...u,
                username: this.username(),
                email: this.email(),
                role: this.selectedRole(),
              }
            : u,
        ),
      );
    } else {
      const newUser: User = {
        refTournament: this.tournament().ref,
        username: this.username(),
        email: this.email(),
        role: this.selectedRole(),
        token: crypto.randomUUID(),
      };
      await this.firebaseService.createUser(newUser);
      this.users.update((list) => [...list, newUser]);
    }
    this.dialogVisible.set(false);
  }

  onDeleteUser(user: User): void {
    this.pendingDeleteUser.set(user);
    this.deleteConfirmVisible.set(true);
  }

  async onConfirmDelete(): Promise<void> {
    const user = this.pendingDeleteUser();
    if (user?.ref) {
      await this.firebaseService.deleteUserDoc(user.ref);
      this.users.update((list) => list.filter((u) => u.ref?.id !== user.ref!.id));
    }
    this.pendingDeleteUser.set(null);
    this.deleteConfirmVisible.set(false);
  }

  onCancelDelete(): void {
    this.pendingDeleteUser.set(null);
    this.deleteConfirmVisible.set(false);
  }
}
