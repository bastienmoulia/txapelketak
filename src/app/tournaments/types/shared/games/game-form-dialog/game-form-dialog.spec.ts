import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GameFormDialog } from './game-form-dialog';
import { Team } from '../../teams/teams';
import { Poule } from '../../../poules/poules';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('GameFormDialog', () => {
  let component: GameFormDialog;
  let fixture: ComponentFixture<GameFormDialog>;
  let mockConfig: DynamicDialogConfig;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const team1Ref = { id: 'team-1' } as DocumentReference;
    const team2Ref = { id: 'team-2' } as DocumentReference;
    const pouleRef = { id: 'poule-1' } as DocumentReference;

    mockConfig = {
      data: {
        teams: [
          { ref: team1Ref, name: 'Team 1' },
          { ref: team2Ref, name: 'Team 2' },
        ] as Team[],
        role: 'admin',
        isEditing: false,
        currentPoule: {
          ref: pouleRef,
          name: 'Poule A',
          refTeams: [team1Ref, team2Ref],
        } as Poule,
      },
    } as DynamicDialogConfig;

    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GameFormDialog],
      providers: [
        { provide: DynamicDialogConfig, useValue: mockConfig },
        { provide: DynamicDialogRef, useValue: mockRef },
        ...provideTranslocoTesting(),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable save button when teams are not selected', () => {
    expect(component.isSaveDisabled()).toBe(true);
  });

  it('should enable save button when both teams are selected', () => {
    const team1Ref = { id: 'team-1' } as DocumentReference;
    const team2Ref = { id: 'team-2' } as DocumentReference;
    component.selectedTeam1Ref.set(team1Ref);
    component.selectedTeam2Ref.set(team2Ref);

    expect(component.isSaveDisabled()).toBe(false);
  });

  it('should disable save button when both teams are the same', () => {
    const teamRef = { id: 'team-1' } as DocumentReference;
    component.selectedTeam1Ref.set(teamRef);
    component.selectedTeam2Ref.set(teamRef);

    expect(component.isSameTeam()).toBe(true);
    expect(component.isSaveDisabled()).toBe(true);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();

    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should not show delete button when not editing', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteBtn = compiled.querySelector('[data-testid="delete-game-button"]');
    expect(deleteBtn).toBeNull();
  });
});

describe('GameFormDialog (editing, admin)', () => {
  let component: GameFormDialog;
  let fixture: ComponentFixture<GameFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const team1Ref = { id: 'team-1' } as DocumentReference;
    const team2Ref = { id: 'team-2' } as DocumentReference;
    const pouleRef = { id: 'poule-1' } as DocumentReference;
    const gameRef = { id: 'game-1' } as DocumentReference;

    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GameFormDialog],
      providers: [
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              teams: [
                { ref: team1Ref, name: 'Team 1' },
                { ref: team2Ref, name: 'Team 2' },
              ] as Team[],
              role: 'admin',
              isEditing: true,
              currentPoule: {
                ref: pouleRef,
                name: 'Poule A',
                refTeams: [team1Ref, team2Ref],
              } as Poule,
              gameRef,
              initialTeam1Ref: team1Ref,
              initialTeam2Ref: team2Ref,
            },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
        ...provideTranslocoTesting(),
        provideAnimationsAsync(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GameFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should show delete button when editing as admin', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteBtn = compiled.querySelector('[data-testid="delete-game-button"]');
    expect(deleteBtn).toBeTruthy();
  });

  it('should close with delete action when delete is clicked', () => {
    component.onDelete();
    expect(mockRef.close).toHaveBeenCalledWith({ action: 'delete' });
  });
});
