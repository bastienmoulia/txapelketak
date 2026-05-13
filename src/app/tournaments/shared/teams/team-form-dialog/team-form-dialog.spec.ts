import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TeamFormDialog } from './team-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

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
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Team A',
      comment: undefined,
    });
  });

  it('should trim whitespace from name on save', () => {
    component.teamName.set('  Team B  ');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Team B',
      comment: undefined,
    });
  });

  it('should save comment when set', () => {
    component.teamName.set('Team A');
    component.teamComment.set('A note about this team');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Team A',
      comment: 'A note about this team',
    });
  });

  it('should save comment as undefined when empty', () => {
    component.teamName.set('Team A');
    component.teamComment.set('');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Team A',
      comment: undefined,
    });
  });

  it('should not show delete button when not editing', () => {
    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="delete-team-button"]');
    expect(deleteBtn).toBeNull();
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
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Équipe B',
      comment: undefined,
    });
  });

  it('should show delete button when editing', () => {
    const deleteBtn = fixture.nativeElement.querySelector('[data-testid="delete-team-button"]');
    expect(deleteBtn).not.toBeNull();
  });

  it('should close with { action: "delete" } when delete is clicked', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});

describe('TeamFormDialog (edit mode with comment)', () => {
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
            data: { isEditing: true, team: { ref: teamRef, name: 'Équipe A', comment: 'A note' } },
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

  it('should pre-fill comment when editing with a comment', () => {
    expect(component.teamComment()).toBe('A note');
  });

  it('should save comment when editing', () => {
    component.teamName.set('Équipe A');
    component.teamComment.set('Updated note');
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith({
      ref: teamRef,
      name: 'Équipe A',
      comment: 'Updated note',
    });
  });
});
