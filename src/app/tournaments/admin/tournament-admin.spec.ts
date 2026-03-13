import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { TournamentAdmin } from './tournament-admin';

describe('TournamentAdmin', () => {
  let component: TournamentAdmin;
  let fixture: ComponentFixture<TournamentAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentAdmin],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => {
                  if (key === 'tournamentId') return '123';
                  if (key === 'token') return 'token-abc';
                  return null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should read tournament id and token from the route', () => {
    expect(component.tournamentId()).toBe('123');
    expect(component.token()).toBe('token-abc');
  });

  it('should deny access when firestore is unavailable', () => {
    expect(component.loading()).toBe(false);
    expect(component.accessDenied()).toBe(true);
    expect(component.user()).toBeNull();
  });
});
