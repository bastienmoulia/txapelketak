import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

import { TournamentHeader } from './tournament-header';

describe('TournamentHeader', () => {
  let component: TournamentHeader;
  let fixture: ComponentFixture<TournamentHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentHeader],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentHeader);
    fixture.componentRef.setInput('tournament', {
      id: 1,
      name: 'Tournoi de test',
      description: 'Description de test',
      type: 'poules',
      status: 'ongoing',
      createdAt: '2026-03-16T00:00:00.000Z',
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle details section', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.tournament-details')).toBeNull();

    component.toggleDetails();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tournament-details')).not.toBeNull();
  });

  it('should render edit button when admin is true', () => {
    fixture.componentRef.setInput('admin', true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="edit-tournament-button"]'),
    ).not.toBeNull();
  });

  it('should not render edit button when admin is false', () => {
    fixture.componentRef.setInput('admin', false);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="edit-tournament-button"]'),
    ).toBeNull();
  });
});
