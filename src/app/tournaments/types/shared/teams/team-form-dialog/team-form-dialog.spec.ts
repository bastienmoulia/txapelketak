import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TeamFormDialog } from './team-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('TeamFormDialog', () => {
  let component: TeamFormDialog;
  let fixture: ComponentFixture<TeamFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TeamFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: { isEditing: false, team: { ref: { id: 'team-1' } as DocumentReference, name: '' } },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamFormDialog);
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

  it('should not save when form is invalid (empty name)', () => {
    component.team.set({ ref: { id: 'team-1' } as DocumentReference, name: '' });
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with team data on save when form is valid', () => {
    const ref = { id: 'team-1' } as DocumentReference;
    component.team.set({ ref, name: 'Team A' });
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({ ref, name: 'Team A' });
  });
});
