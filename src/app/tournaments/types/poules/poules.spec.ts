import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';

import { Poules } from './poules';

describe('Poules', () => {
  let component: Poules;
  let fixture: ComponentFixture<Poules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Poules],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Poules);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Test Tournoi',
      description: '',
      type: 'poules',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      data: { teams: [], series: [] },
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
