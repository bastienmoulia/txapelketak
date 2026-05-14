import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PlayoffsFormDialog } from './playoffs-form-dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

const asSelectedTeam = (team: { ref: DocumentReference; name: string }) => ({
  key: team.ref.id,
  value: team.name,
});

describe('PlayoffsFormDialog', () => {
  let component: PlayoffsFormDialog;
  let fixture: ComponentFixture<PlayoffsFormDialog>;
  let mockRef: { close: ReturnType<typeof vi.fn> };

  const serieRef = { id: 'serie-1' } as DocumentReference;
  const teamARef = { id: 'team-a' } as DocumentReference;
  const teamBRef = { id: 'team-b' } as DocumentReference;
  const teamCRef = { id: 'team-c' } as DocumentReference;
  const teamDRef = { id: 'team-d' } as DocumentReference;

  const teams = [
    { ref: teamARef, name: 'Team A' },
    { ref: teamBRef, name: 'Team B' },
    { ref: teamCRef, name: 'Team C' },
    { ref: teamDRef, name: 'Team D' },
  ];

  beforeEach(async () => {
    mockRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [PlayoffsFormDialog],
      providers: [
        provideAnimationsAsync(),
        ...provideTranslocoTesting(),
        {
          provide: DynamicDialogConfig,
          useValue: {
            data: { serieRef, teams },
          },
        },
        { provide: DynamicDialogRef, useValue: mockRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayoffsFormDialog);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start on step 1', () => {
    expect(component.currentStep()).toBe(1);
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockRef.close).toHaveBeenCalledWith(undefined);
  });

  it('should not go to step 2 when name is empty', () => {
    component.playoffsName.set('');
    component.selectedTeams.set([asSelectedTeam(teams[0])]);
    component.onNext();
    expect(component.currentStep()).toBe(1);
  });

  it('should not go to step 2 when no teams selected', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([]);
    component.onNext();
    expect(component.currentStep()).toBe(1);
  });

  it('canGoNext is false when name empty and no teams', () => {
    component.playoffsName.set('');
    component.selectedTeams.set([]);
    expect(component.canGoNext()).toBe(false);
  });

  it('canGoNext is true when name and teams provided', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([asSelectedTeam(teams[0])]);
    expect(component.canGoNext()).toBe(true);
  });

  it('should go to step 2 when name and teams are set', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    component.onNext();
    expect(component.currentStep()).toBe(2);
  });

  it('should go back to step 1 from step 2', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    component.onNext();
    component.onBack();
    expect(component.currentStep()).toBe(1);
  });

  it('should add a team when a ref is pending', () => {
    component.pendingTeamRef.set([teamARef.id]);
    component.onAddSelectedTeam();
    expect(component.selectedTeams().length).toBe(1);
    expect(component.selectedTeams()[0].value).toBe('Team A');
    expect(component.pendingTeamRef()).toEqual([]);
  });

  it('should not add a duplicate team', () => {
    component.selectedTeams.set([asSelectedTeam(teams[0])]);
    component.pendingTeamRef.set([teamARef.id]);
    component.onAddSelectedTeam();
    expect(component.selectedTeams().length).toBe(1);
  });

  it('should add multiple teams when refs are pending', () => {
    component.pendingTeamRef.set([teamARef.id, teamBRef.id]);
    component.onAddSelectedTeam();
    expect(component.selectedTeams()).toEqual([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    expect(component.pendingTeamRef()).toEqual([]);
  });

  it('should remove a team', () => {
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    component.onRemoveTeam(asSelectedTeam(teams[0]));
    expect(component.selectedTeams().length).toBe(1);
    expect(component.selectedTeams()[0].value).toBe('Team B');
  });

  it('should compute bracket size as next power of 2', () => {
    component.selectedTeams.set([asSelectedTeam(teams[0])]);
    expect(component.bracketSize()).toBe(2);

    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    expect(component.bracketSize()).toBe(2);

    component.selectedTeams.set([
      asSelectedTeam(teams[0]),
      asSelectedTeam(teams[1]),
      asSelectedTeam(teams[2]),
    ]);
    expect(component.bracketSize()).toBe(4);

    component.selectedTeams.set(teams.map(asSelectedTeam)); // 4 teams
    expect(component.bracketSize()).toBe(4);
  });

  it('should not save when name is empty', () => {
    component.playoffsName.set('');
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should not save when no teams selected', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([]);
    component.onSave();
    expect(mockRef.close).not.toHaveBeenCalled();
  });

  it('should close with playoffs event on save', () => {
    component.playoffsName.set('My Playoffs');
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    component.onSave();
    const result = mockRef.close.mock.calls[0][0];
    expect(result.name).toBe('My Playoffs');
    expect(result.serieRef).toBeDefined();
    expect(result.orderedTeamRefs).toHaveLength(2);
    expect(result.size).toBe(2);
  });

  it('should compute bracket preview for first round with actual teams', () => {
    component.selectedTeams.set([asSelectedTeam(teams[0]), asSelectedTeam(teams[1])]);
    const preview = component.bracketPreview();
    // size=2 → 1 round (Finale), 1 match
    const firstRound = preview.find((r) => r.roundOrder === 2);
    expect(firstRound).toBeDefined();
    expect(firstRound!.matches[0].team1Name).toBe('Team A');
    expect(firstRound!.matches[0].team2Name).toBe('Team B');
  });

  it('should show bye for missing team slots', () => {
    // 3 teams → bracketSize=4, first round has 2 matches (4/2=2)
    // Match 1: team[0] vs team[1], Match 2: team[2] vs bye
    component.selectedTeams.set([
      asSelectedTeam(teams[0]),
      asSelectedTeam(teams[1]),
      asSelectedTeam(teams[2]),
    ]);
    const preview = component.bracketPreview();
    const firstRound = preview.find((r) => r.roundOrder === 4);
    expect(firstRound).toBeDefined();
    expect(firstRound!.matches).toHaveLength(2);
    expect(firstRound!.matches[1].isBye).toBe(true);
  });

  it('should exclude already-selected teams from availableTeams', () => {
    component.selectedTeams.set([asSelectedTeam(teams[0])]);
    const available = component.availableTeams();
    expect(available.some((t) => t.key === teamARef.id)).toBe(false);
    expect(available.length).toBe(3);
  });
});
