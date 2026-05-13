import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SerieFormDialog } from './serie-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('SerieFormDialog', () => {
  let component: SerieFormDialog;
  let fixture: ComponentFixture<SerieFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SerieFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: { data: { isEditing: false, serieName: '', editingSerie: null } },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SerieFormDialog);
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
    component.serieName.set('');
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with serie name on save', () => {
    component.serieName.set('Serie 1');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({ name: 'Serie 1', ref: undefined });
  });

  it('should close with delete action on delete', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});

describe('SerieFormDialog (editing)', () => {
  let component: SerieFormDialog;
  let fixture: ComponentFixture<SerieFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [SerieFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              isEditing: true,
              serieName: 'Série A',
              editingSerie: { ref: { id: 'serie-1' }, name: 'Série A' },
              canDelete: true,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SerieFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should show delete button when editing', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteBtn = compiled.querySelector('[data-testid="delete-serie-button"]');
    expect(deleteBtn).toBeTruthy();
  });

  it('should close with delete action when delete is clicked', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});
