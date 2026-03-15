import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Admin } from './admin';
import { provideTranslocoTesting } from '../testing/transloco-testing.providers';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ tournamentId: '123', token: 'token-abc' }),
            snapshot: {
              params: { tournamentId: '123', token: 'token-abc' },
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
        ...provideTranslocoTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
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
