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

  const teamRef = { id: 'team-1' } as DocumentReference;

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
            data: { isEditing: false, team: { ref: teamRef, name: '' } },
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

  it('should not save when name is empty', () => {
    component.teamName.set('');
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should not save when name is only whitespace', () => {
    component.teamName.set('   ');
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with team data on save when name is valid', () => {
    component.teamName.set('Team A');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({ ref: teamRef, name: 'Team A' });
  });

  it('should trim whitespace from name on save', () => {
    component.teamName.set('  Team B  ');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({ ref: teamRef, name: 'Team B' });
  });
});

describe('TeamFormDialog (edit mode)', () => {
  let component: TeamFormDialog;
  let fixture: ComponentFixture<TeamFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const teamRef = { id: 'team-edit' } as DocumentReference;

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
            data: { isEditing: true, team: { ref: teamRef, name: 'Équipe A' } },
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

  it('should pre-fill team name when editing', () => {
    expect(component.teamName()).toBe('Équipe A');
  });

  it('should save updated name and preserve original ref', () => {
    component.teamName.set('Équipe B');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({ ref: teamRef, name: 'Équipe B' });
  });
});

