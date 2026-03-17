import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTeams } from './admin-teams';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('AdminTeams', () => {
  let component: AdminTeams;
  let fixture: ComponentFixture<AdminTeams>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTeams],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTeams);
    fixture.componentRef.setInput('teams', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render add team button', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="add-team-button"]')).not.toBeNull();
  });

  it('should render edit and delete buttons for each team row', () => {
    fixture.componentRef.setInput('teams', [
      { id: '1', name: 'Équipe A', players: [] },
      { id: '2', name: 'Équipe B', players: [] },
    ]);
    fixture.detectChanges();

    const editButtons = fixture.nativeElement.querySelectorAll('[data-testid="edit-team-button"]');
    const deleteButtons = fixture.nativeElement.querySelectorAll(
      '[data-testid="delete-team-button"]',
    );

    expect(editButtons.length).toBe(2);
    expect(deleteButtons.length).toBe(2);
  });

  it('should open dialog when add team button is clicked', () => {
    expect(component.visible()).toBe(false);
    expect(component.isEditing()).toBe(false);

    component.onAddTeam();

    expect(component.visible()).toBe(true);
    expect(component.isEditing()).toBe(false);
  });

  it('should open dialog in edit mode when edit button is clicked', () => {
    const team = { id: '1', name: 'Équipe A' };
    component.onEditTeam(team);

    expect(component.visible()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.team()).toEqual(team);
  });

  it('should emit saveTeam event when saving a valid team', () => {
    const emitted: { id: string; name: string }[] = [];
    component.saveTeam.subscribe((t) => emitted.push(t));

    component.onAddTeam();
    component.team.set({ id: '', name: 'New Team' });
    component.onSaveTeam();

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('New Team');
    expect(component.visible()).toBe(false);
  });

  it('should emit deleteTeam event when delete is called', () => {
    const emitted: { id: string; name: string }[] = [];
    component.deleteTeam.subscribe((t) => emitted.push(t));

    const team = { id: '1', name: 'Équipe A' };
    component.onDeleteTeam(team);

    expect(emitted.length).toBe(1);
    expect(emitted[0]).toEqual(team);
  });

  it('should emit saveTeams event with parsed names from bulk text', () => {
    const emitted: { id: string; name: string }[][] = [];
    component.saveTeams.subscribe((t) => emitted.push(t));

    component.bulkText.set('Team A\nTeam B\n\nTeam C');
    component.onSaveTeams();

    expect(emitted.length).toBe(1);
    expect(emitted[0].length).toBe(3);
    expect(emitted[0].map((t) => t.name)).toEqual(['Team A', 'Team B', 'Team C']);
  });
});
