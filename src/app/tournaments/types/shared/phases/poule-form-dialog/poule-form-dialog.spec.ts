import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmationService } from 'primeng/api';
import { PouleFormDialog } from './poule-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('PouleFormDialog', () => {
  let component: PouleFormDialog;
  let fixture: ComponentFixture<PouleFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };
  let confirmationService: ConfirmationService;

  beforeEach(async () => {
    mockRef = { close: vi.fn() };
    const serieRef = { id: 'serie-1' } as DocumentReference;
    const teamARef = { id: 'team-a' } as DocumentReference;
    const teamBRef = { id: 'team-b' } as DocumentReference;

    await TestBed.configureTestingModule({
      imports: [PouleFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              isEditing: false,
              pouleName: '',
              editingPoule: null,
              serieRef,
              teams: [
                { ref: teamARef, name: 'Team A' },
                { ref: teamBRef, name: 'Team B' },
              ],
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PouleFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
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
    expect(result.teamRefs).toEqual([]);
  });

  it('should close with delete action on delete', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });

  it('should remove a selected team without confirmation while creating', () => {
    const teamARef = { id: 'team-a' } as DocumentReference;
    const teamBRef = { id: 'team-b' } as DocumentReference;
    const confirmSpy = vi.spyOn(confirmationService, 'confirm');

    component.selectedTeamRefs.set([teamARef, teamBRef]);
    component.onRequestRemoveTeam(teamARef);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(component.selectedTeamRefs().map((ref) => ref.id)).toEqual(['team-b']);
  });
});

describe('PouleFormDialog (editing)', () => {
  let component: PouleFormDialog;
  let fixture: ComponentFixture<PouleFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };
  let confirmationService: ConfirmationService;
  let teamARef: DocumentReference;
  let teamBRef: DocumentReference;
  let teamCRef: DocumentReference;

  beforeEach(async () => {
    mockRef = { close: vi.fn() };
    const serieRef = { id: 'serie-1' } as DocumentReference;
    const pouleRef = { id: 'poule-1' } as DocumentReference;
    teamARef = { id: 'team-a' } as DocumentReference;
    teamBRef = { id: 'team-b' } as DocumentReference;
    teamCRef = { id: 'team-c' } as DocumentReference;

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
              editingPoule: { ref: pouleRef, name: 'Poule A', refTeams: [teamARef, teamBRef] },
              serieRef,
              teams: [
                { ref: teamARef, name: 'Team A' },
                { ref: teamBRef, name: 'Team B' },
                { ref: teamCRef, name: 'Team C' },
              ],
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PouleFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    confirmationService = fixture.debugElement.injector.get(ConfirmationService);
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

  it('should initialize selected teams from the edited poule', () => {
    expect(component.selectedTeamRefs()).toEqual([teamARef, teamBRef]);
  });

  it('should add a selected team', () => {
    component.pendingTeamRef.set(teamCRef);
    component.onAddSelectedTeam();

    expect(component.selectedTeamRefs().map((ref) => ref.id)).toEqual([
      'team-a',
      'team-b',
      'team-c',
    ]);
    expect(component.pendingTeamRef()).toBeNull();
  });

  it('should confirm and remove a selected team', () => {
    const confirmSpy = vi.spyOn(confirmationService, 'confirm');
    component.onRequestRemoveTeam(teamARef);
    const confirmationConfig = confirmSpy.mock.calls[0][0] as {
      accept?: () => void;
    };

    expect(confirmSpy).toHaveBeenCalled();
    expect(confirmationConfig.accept).toBeDefined();

    confirmationConfig.accept?.();
    expect(component.selectedTeamRefs().map((ref) => ref.id)).toEqual(['team-b']);
  });

  it('should return final team refs on save', () => {
    component.pendingTeamRef.set(teamCRef);
    component.onAddSelectedTeam();

    component.pouleName.set('Poule edit');
    component.onSave();

    const result = mockRef.close.mock.calls[0][0];
    expect(result.teamRefs.map((ref: DocumentReference) => ref.id)).toEqual([
      'team-a',
      'team-b',
      'team-c',
    ]);
  });
});
