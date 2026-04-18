import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ImportConfirmDialog } from './import-confirm-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('ImportConfirmDialog', () => {
  let component: ImportConfirmDialog;
  let fixture: ComponentFixture<ImportConfirmDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ImportConfirmDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: { data: { teamsCount: 5, seriesCount: 2 } },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportConfirmDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose data from config', () => {
    expect(component.data.teamsCount).toBe(5);
    expect(component.data.seriesCount).toBe(2);
  });

  it('should close with undefined on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should close with true on confirm', () => {
    component.onConfirm();
    expect(mockRef.close).toHaveBeenCalledWith(true);
  });
});
