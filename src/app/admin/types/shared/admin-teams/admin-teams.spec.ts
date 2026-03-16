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
});
