import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { TournamentDetail } from './tournament-detail';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

describe('TournamentDetail', () => {
  let component: TournamentDetail;
  let fixture: ComponentFixture<TournamentDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tournamentId: 'test-id-123' }),
            snapshot: {
              params: { tournamentId: 'test-id-123' },
              paramMap: { get: () => 'test-id-123' },
            },
          },
        },
        ...provideTranslocoTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read the tournament id from the route', () => {
    expect(component.tournamentId()).toBe('test-id-123');
  });

  it('should show not found when tournament does not exist', () => {
    expect(component.notFound()).toBe(true);
  });

  it('should render tournament status label using pipe', () => {
    component.loading.set(false);
    component.notFound.set(false);
    component.tournament.set({
      id: 123,
      name: 'Tournoi test',
      description: 'Description',
      type: 'poules',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
    });

    fixture.detectChanges();

    const statusTag = fixture.nativeElement.querySelector('p-tag');
    expect(statusTag?.textContent?.trim()).toBe('En cours');
  });

  it('should show waiting validation message and hide types', () => {
    component.loading.set(false);
    component.notFound.set(false);
    component.tournament.set({
      id: 123,
      name: 'Tournoi test',
      description: 'Description',
      type: 'poules',
      status: 'waitingValidation',
      createdAt: new Date().toISOString(),
    });

    fixture.detectChanges();

    const validationSection = fixture.nativeElement.querySelector(
      '[data-testid="validation-section"]',
    );
    const typesComponent = fixture.nativeElement.querySelector('app-types');

    expect(validationSection).toBeTruthy();
    expect(typesComponent).toBeFalsy();
  });
});
