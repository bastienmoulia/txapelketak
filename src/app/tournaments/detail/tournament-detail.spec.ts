import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { DocumentReference } from '@angular/fire/firestore';
import { of } from 'rxjs';
import { patchState } from '@ngrx/signals';

import { TournamentDetail } from './tournament-detail';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';
import { TournamentDetailStore } from '../../store/tournament-detail.store';
import { TournamentActionsService } from '../../shared/services/tournament-actions.service';

describe('TournamentDetail', () => {
  let component: TournamentDetail;
  let fixture: ComponentFixture<TournamentDetail>;
  let store: InstanceType<typeof TournamentDetailStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tournamentId: 'test-id-123' }),
            queryParamMap: of(convertToParamMap({})),
            snapshot: {
              params: { tournamentId: 'test-id-123' },
              paramMap: convertToParamMap({ tournamentId: 'test-id-123' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        ...provideTranslocoTesting(),
        { provide: TournamentActionsService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentDetail);
    component = fixture.componentInstance;
    store = TestBed.inject(TournamentDetailStore);
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

  it('should render tournament name in header', () => {
    patchState(store, {
      loading: false,
      notFound: false,
      tournament: {
        ref: { id: '123' } as DocumentReference,
        name: 'Tournoi test',
        description: 'Description',
        type: 'poules',
        status: 'ongoing',
        createdAt: new Date().toISOString(),
      },
    });

    fixture.detectChanges();

    const header = fixture.nativeElement.querySelector('app-tournament-header');
    expect(header?.textContent).toContain('Tournoi test');
  });

  it('should show waiting validation message and hide types', () => {
    patchState(store, {
      loading: false,
      notFound: false,
      tournament: {
        ref: { id: '123' } as DocumentReference,
        name: 'Tournoi test',
        description: 'Description',
        type: 'poules',
        status: 'waitingValidation',
        createdAt: new Date().toISOString(),
      },
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
