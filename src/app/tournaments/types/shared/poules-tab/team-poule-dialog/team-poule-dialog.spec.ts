import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TeamPouleDialog } from './team-poule-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../../testing/transloco-testing.providers';
import type { Team } from '../../teams/teams';
import type { Poule } from '../../../poules/poules';

describe('TeamPouleDialog', () => {
  let component: TeamPouleDialog;
  let fixture: ComponentFixture<TeamPouleDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const teamARef = { id: 'team-a' } as DocumentReference;
  const teamBRef = { id: 'team-b' } as DocumentReference;
  const poule: Poule = { ref: { id: 'poule-1' } as DocumentReference, name: 'Poule A', refTeams: [teamARef] };
  const teams: Team[] = [
    { ref: teamARef, name: 'Team A' },
    { ref: teamBRef, name: 'Team B' },
  ];

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [TeamPouleDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        { provide: DynamicDialogConfig, useValue: { data: { poule, teams } } },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamPouleDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter out teams already in poule', () => {
    const available = component.availableTeams();
    expect(available.length).toBe(1);
    expect(available[0].ref.id).toBe('team-b');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should not save when no teams are selected', () => {
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with selected team refs on save', () => {
    component.selectedTeamRefs.set([teamBRef]);
    component.onSave();
    expect(mockRef.close).toHaveBeenCalledWith([teamBRef]);
  });
});
