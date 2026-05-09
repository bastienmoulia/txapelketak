import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PouleFormDialog } from './poule-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('PouleFormDialog', () => {
  let component: PouleFormDialog;
  let fixture: ComponentFixture<PouleFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };
    const serieRef = { id: 'serie-1' } as DocumentReference;

    await TestBed.configureTestingModule({
      imports: [PouleFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: { isEditing: false, pouleName: '', editingPoule: null, serieRef },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PouleFormDialog);
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

  it('should not save when name is empty', () => {
    component.pouleName.set('');
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with poule data on save', () => {
    component.pouleName.set('Poule A');
    component.onSave();
    const result = mockRef.close.mock.calls[0][0];
    expect(result.name).toBe('Poule A');
    expect(result.serieRef).toBeDefined();
    expect(result.ref).toBeUndefined();
  });

  it('should close with delete action on delete', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});

describe('PouleFormDialog (editing)', () => {
  let component: PouleFormDialog;
  let fixture: ComponentFixture<PouleFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };
    const serieRef = { id: 'serie-1' } as DocumentReference;
    const pouleRef = { id: 'poule-1' } as DocumentReference;

    await TestBed.configureTestingModule({
      imports: [PouleFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              isEditing: true,
              pouleName: 'Poule A',
              editingPoule: { ref: pouleRef, name: 'Poule A' },
              serieRef,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PouleFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should show delete button when editing', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteBtn = compiled.querySelector('[data-testid="delete-poule-button"]');
    expect(deleteBtn).toBeTruthy();
  });

  it('should close with delete action when delete is clicked', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});
