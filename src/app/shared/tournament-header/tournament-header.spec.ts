import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
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
      ref: { id: '1' } as DocumentReference,
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

  it('should render edit button when admin is true', () => {
    fixture.componentRef.setInput('role', 'admin');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="edit-tournament-button"]'),
    ).not.toBeNull();
  });

  it('should not render edit button when role is empty', () => {
    fixture.componentRef.setInput('role', '');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[data-testid="edit-tournament-button"]'),
    ).toBeNull();
  });
});
