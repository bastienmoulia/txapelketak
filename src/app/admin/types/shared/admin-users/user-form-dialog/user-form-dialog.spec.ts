import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserFormDialog } from './user-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('UserFormDialog', () => {
  let component: UserFormDialog;
  let fixture: ComponentFixture<UserFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UserFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              isEditing: false,
              username: '',
              email: '',
              selectedRole: null,
              editingRef: null,
              isEditingCurrentUser: false,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should be disabled when fields are empty', () => {
    expect(component.isSaveDisabled()).toBe(true);
  });

  it('should not save when form is invalid', () => {
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with user data on save when form is valid', () => {
    component.username.set('john');
    component.email.set('john@example.com');
    component.selectedRole.set('admin');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      username: 'john',
      email: 'john@example.com',
      role: 'admin',
      ref: undefined,
    });
  });

  it('should include ref when editing', () => {
    const ref = { id: 'user-1' } as DocumentReference;
    component.data.editingRef = ref;
    component.username.set('jane');
    component.email.set('jane@example.com');
    component.selectedRole.set('organizer');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      username: 'jane',
      email: 'jane@example.com',
      role: 'organizer',
      ref,
    });
  });
});
