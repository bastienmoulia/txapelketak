import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GameFormDialog } from './game-form-dialog';
import { Poule, Team } from '../../../models';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

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

describe('GameFormDialog (editing playoff slot without teams)', () => {
  let component: GameFormDialog;
  let fixture: ComponentFixture<GameFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [GameFormDialog],
      providers: [
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: {
              teams: [] as Team[],
              role: 'admin',
              isEditing: true,
              currentPoule: {
                ref: {
                  id: 'playoff-1',
                  path: 'tournaments/t1/series/s1/playoffs/playoff-1',
                } as DocumentReference,
                name: 'Playoff',
                refTeams: [],
              } as Poule,
              gameRef: {
                id: 'game-1',
                path: 'tournaments/t1/series/s1/playoffs/playoff-1/games/game-1',
              } as DocumentReference,
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

  it('should not show delete button when editing a playoff game', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const deleteBtn = compiled.querySelector('[data-testid="delete-game-button"]');
    expect(deleteBtn).toBeNull();
  });

  it('should allow saving when editing without selected teams', () => {
    component.gameDate.set(new Date('2026-05-20T10:00:00.000Z'));

    expect(component.isSaveDisabled()).toBe(false);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith(
      expect.objectContaining({
        pouleRef: expect.objectContaining({ id: 'playoff-1' }),
        gameRef: expect.objectContaining({ id: 'game-1' }),
        isBye: false,
        scoreTeam1: null,
        scoreTeam2: null,
        date: new Date('2026-05-20T10:00:00.000Z'),
        referees: null,
        comment: null,
      }),
    );
  });
});

describe('GameFormDialog (first-round playoff bye)', () => {
  let component: GameFormDialog;
  let fixture: ComponentFixture<GameFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const team1Ref = { id: 'team-1' } as DocumentReference;
    const team2Ref = { id: 'team-2' } as DocumentReference;
    const gameRef = {
      id: 'game-1',
      path: 'tournaments/t1/series/s1/playoffs/playoff-1/games/game-1',
    } as DocumentReference;

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
                ref: {
                  id: 'playoff-1',
                  path: 'tournaments/t1/series/s1/playoffs/playoff-1',
                } as DocumentReference,
                name: 'Playoff',
                refTeams: [team1Ref, team2Ref],
                games: [
                  {
                    ref: gameRef,
                    roundSize: 8,
                    matchNumber: 1,
                  },
                  {
                    ref: {
                      id: 'game-2',
                      path: 'tournaments/t1/series/s1/playoffs/playoff-1/games/game-2',
                    } as DocumentReference,
                    roundSize: 4,
                    matchNumber: 1,
                  },
                ],
              } as Poule,
              gameRef,
              initialTeam1Ref: team1Ref,
              initialTeam2Ref: team2Ref,
              initialScoreTeam1: 10,
              initialScoreTeam2: 8,
              initialDate: new Date('2026-05-20T10:00:00.000Z'),
              initialReferees: ['Ref A'],
              initialComment: 'test',
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

  it('should show bye toggle for first-round playoff game', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const toggleInput = compiled.querySelector('#gameIsBye');

    expect(component.showByeToggle()).toBe(true);
    expect(toggleInput).toBeTruthy();
  });

  it('should hide team2, date and referees inputs when bye is enabled', async () => {
    component.onByeToggleChange(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#team2')).toBeNull();
    expect(compiled.querySelector('#score2')).toBeNull();
    expect(compiled.querySelector('#gameDate')).toBeNull();
    expect(compiled.querySelector('#referees')).toBeNull();
  });

  it('should save bye payload with cleared fields', () => {
    component.onByeToggleChange(true);

    component.onSave();

    expect(mockRef.close).toHaveBeenCalledWith(
      expect.objectContaining({
        gameRef: expect.objectContaining({ id: 'game-1' }),
        isBye: true,
        scoreTeam1: null,
        scoreTeam2: null,
        date: null,
        referees: null,
      }),
    );
  });
});
