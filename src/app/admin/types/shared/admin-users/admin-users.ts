import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { DialogService } from 'primeng/dynamicdialog';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { Tournament, User, UserRole } from '../../../../home/tournament.interface';
import { DocumentReference } from '@angular/fire/firestore';
import { TooltipModule } from 'primeng/tooltip';
import { RoleBadge } from '../../../../shared/role-badge/role-badge';
import { UserFormDialog, UserFormResult } from './user-form-dialog/user-form-dialog';

@Component({
  selector: 'app-admin-users',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    MessageModule,
    TableModule,
    ToastModule,
    TranslocoModule,
    TooltipModule,
    RoleBadge,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsers {
  private readonly toastKey = 'admin-users';
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);

  tournament = input.required<Tournament>();
  currentUser = input<User | null>(null);

  users = signal<User[]>([]);

  private loadedTournamentId = signal<string | null>(null);

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
    const dialogRef = this.dialogService.open(UserFormDialog, {
      header: this.translocoService.translate('admin.users.dialogAdd'),
      modal: true,
      closable: true,
      width: 'min(28rem, 100%)',
      data: {
        isEditing: false,
        username: '',
        email: '',
        selectedRole: null,
        editingRef: null,
        isEditingCurrentUser: false,
      },
    });
    dialogRef?.onClose.subscribe((result: UserFormResult | undefined) => {
      if (result) {
        void this.saveUser(result);
      }
    });
  }

  onEditUser(user: User): void {
    const dialogRef = this.dialogService.open(UserFormDialog, {
      header: this.translocoService.translate('admin.users.dialogEdit'),
      modal: true,
      closable: true,
      width: 'min(28rem, 100%)',
      data: {
        isEditing: true,
        username: user.username,
        email: user.email,
        selectedRole: user.role,
        editingRef: user.ref ?? null,
        isEditingCurrentUser: user.ref?.id === this.currentUser()?.ref?.id,
      },
    });
    dialogRef?.onClose.subscribe((result: UserFormResult | undefined) => {
      if (result) {
        void this.saveUser(result);
      }
    });
  }

  private async saveUser(data: UserFormResult): Promise<void> {
    if (!data.username || !data.email || !data.role) {
      return;
    }

    const ref = data.ref;
    if (ref) {
      await this.firebaseService.updateUser(ref, {
        username: data.username,
        email: data.email,
        role: data.role,
      });
      this.users.update((list) =>
        list.map((u) =>
          u.ref?.id === ref.id
            ? { ...u, username: data.username, email: data.email, role: data.role }
            : u,
        ),
      );
      this.messageService.add({
        key: this.toastKey,
        severity: 'success',
        summary: this.translocoService.translate('admin.users.edited'),
        detail: this.translocoService.translate('admin.users.editedDetail', {
          username: data.username,
        }),
      });
    } else {
      const newUser: User = {
        refTournament: this.tournament().ref,
        username: data.username,
        email: data.email,
        role: data.role,
        token: crypto.randomUUID(),
      };
      const createdRef = await this.firebaseService.createUser(newUser);
      const createdUser: User = createdRef ? { ...newUser, ref: createdRef } : newUser;
      const adminUrl = this.buildAdminUrl(newUser.token);

      this.users.update((list) => [...list, createdUser]);
      this.messageService.add({
        key: this.toastKey,
        severity: 'success',
        summary: this.translocoService.translate('admin.users.added'),
        detail: this.translocoService.translate('admin.users.addedDetail', {
          username: newUser.username,
        }),
        data: { adminUrl },
        sticky: true,
      });
    }
  }

  onDeleteUser(user: User): void {
    this.confirmationService.confirm({
      header: this.translocoService.translate('shared.confirm.deleteHeader'),
      message: this.translocoService.translate('admin.users.deleteConfirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translocoService.translate('shared.confirm.confirm'),
      rejectLabel: this.translocoService.translate('shared.confirm.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        void this.deleteUser(user);
      },
    });
  }

  private async deleteUser(user: User): Promise<void> {
    if (user?.ref) {
      await this.firebaseService.deleteUserDoc(user.ref);
      this.users.update((list) => list.filter((u) => u.ref?.id !== user.ref!.id));
      this.messageService.add({
        key: this.toastKey,
        severity: 'success',
        summary: this.translocoService.translate('admin.users.deleted'),
        detail: this.translocoService.translate('admin.users.deletedDetail', {
          username: user.username,
        }),
      });
    }
  }

  private buildAdminUrl(token: string): string {
    const origin = globalThis.location?.origin ?? '';
    const path = `/tournaments/${this.tournament().ref.id}/${token}`;

    return origin ? `${origin}${path}` : path;
  }

  getToastAdminUrl(message: { data?: unknown } | null | undefined): string | null {
    const data = message?.data;
    if (!data || typeof data !== 'object') {
      return null;
    }

    const adminUrl = (data as { adminUrl?: unknown }).adminUrl;
    return typeof adminUrl === 'string' && adminUrl.length > 0 ? adminUrl : null;
  }
}
