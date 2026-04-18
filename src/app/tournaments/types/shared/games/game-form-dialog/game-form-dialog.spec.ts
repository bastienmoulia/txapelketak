import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { GameFormDialog } from './game-form-dialog';
import { Team } from '../../teams/teams';
import { Poule } from '../../../poules/poules';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';

describe('GameFormDialog', () => {
  let component: GameFormDialog;
  let fixture: ComponentFixture<GameFormDialog>;
  let mockConfig: DynamicDialogConfig;

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

    await TestBed.configureTestingModule({
      imports: [GameFormDialog],
      providers: [
        { provide: DynamicDialogConfig, useValue: mockConfig },
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

  it('should close dialog on cancel', () => {
    let closedValue: any;
    mockConfig.close = (value: any) => {
      closedValue = value;
    };

    component.onCancel();

    expect(closedValue).toBeUndefined();
  });
});
