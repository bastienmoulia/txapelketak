import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { FreePhaseFormDialog } from './free-phase-form-dialog';

describe('FreePhaseFormDialog (create mode)', () => {
  let component: FreePhaseFormDialog;
  let fixture: ComponentFixture<FreePhaseFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const serieRef = { id: 'serie-1' } as DocumentReference;

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [FreePhaseFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: { serieRef },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreePhaseFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty name and visible by default', () => {
    expect(component.freePhaseName()).toBe('');
    expect(component.hiddenFromVisitors()).toBe(false);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should close with free phase data on save', () => {
    component.freePhaseName.set('Ma phase libre');
    component.hiddenFromVisitors.set(true);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith({
      serieRef,
      name: 'Ma phase libre',
      hiddenFromVisitors: true,
      ref: undefined,
    });
  });

  it('should allow saving with empty name', () => {
    component.freePhaseName.set('');
    component.hiddenFromVisitors.set(false);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith({
      serieRef,
      name: '',
      hiddenFromVisitors: false,
      ref: undefined,
    });
  });

  it('should trim whitespace from name on save', () => {
    component.freePhaseName.set('  Phase libre  ');

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Phase libre' }),
    );
  });

  it('should show the name input field', () => {
    const nameInput = fixture.nativeElement.querySelector(
      '[data-testid="free-phase-name-input"]',
    );
    expect(nameInput).toBeTruthy();
  });

  it('should show the hidden from visitors toggle', () => {
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="free-phase-hidden-from-visitors-toggle"]',
    );
    expect(toggle).toBeTruthy();
  });
});

describe('FreePhaseFormDialog (edit mode)', () => {
  let component: FreePhaseFormDialog;
  let fixture: ComponentFixture<FreePhaseFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const serieRef = { id: 'serie-1' } as DocumentReference;
  const freePhaseRef = { id: 'free-phase-1' } as DocumentReference;

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [FreePhaseFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              serieRef,
              name: 'Phase A',
              hiddenFromVisitors: true,
              ref: freePhaseRef,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FreePhaseFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should initialize fields from existing free phase', () => {
    expect(component.freePhaseName()).toBe('Phase A');
    expect(component.hiddenFromVisitors()).toBe(true);
  });

  it('should close with updated data on save', () => {
    component.freePhaseName.set('Phase B');
    component.hiddenFromVisitors.set(false);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith({
      serieRef,
      name: 'Phase B',
      hiddenFromVisitors: false,
      ref: freePhaseRef,
    });
  });
});
