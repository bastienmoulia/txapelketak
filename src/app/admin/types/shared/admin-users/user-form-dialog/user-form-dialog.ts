import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DocumentReference } from '@angular/fire/firestore';
import { Button } from 'primeng/button';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserRole } from '../../../../../home/tournament.interface';

export interface UserFormResult {
  username: string;
  email: string;
  role: UserRole;
  ref?: DocumentReference;
}

interface UserFormDialogData {
  isEditing: boolean;
  username: string;
  email: string;
  selectedRole: UserRole | null;
  editingRef: DocumentReference | null;
  isEditingCurrentUser: boolean;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [FormsModule, FloatLabel, InputTextModule, Select, Button, TranslocoPipe],
  templateUrl: './user-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialog {
  private readonly translocoService = inject(TranslocoService);
  private readonly config = inject(DynamicDialogConfig<UserFormDialogData>);
  private readonly dialogRef = inject(DynamicDialogRef);

  data = this.config.data ?? {
    isEditing: false,
    username: '',
    email: '',
    selectedRole: null,
    editingRef: null,
    isEditingCurrentUser: false,
  };

  username = signal(this.data.username);
  email = signal(this.data.email);
  selectedRole = signal<UserRole | null>(this.data.selectedRole);

  private activeLanguage = toSignal(this.translocoService.langChanges$, {
    initialValue: this.translocoService.getActiveLang(),
  });

  roleOptions = computed(() => {
    this.activeLanguage();
    return [
      { value: 'admin', label: this.translocoService.translate('admin.users.role.admin') },
      { value: 'organizer', label: this.translocoService.translate('admin.users.role.organizer') },
    ];
  });

  isSaveDisabled = computed(() => !this.username() || !this.email() || !this.selectedRole());

  onCancel(): void {
    this.dialogRef.close(undefined);
  }

  onSave(): void {
    if (this.isSaveDisabled()) return;
    const result: UserFormResult = {
      username: this.username(),
      email: this.email(),
      role: this.selectedRole()!,
      ref: this.data.editingRef ?? undefined,
    };
    this.dialogRef.close(result);
  }
}
