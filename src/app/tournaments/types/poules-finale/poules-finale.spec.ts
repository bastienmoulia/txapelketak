import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';
import { MessageService } from 'primeng/api';
import { provideRouter } from '@angular/router';

import { PoulesFinale } from './poules-finale';

describe('PoulesFinale', () => {
  let component: PoulesFinale;
  let fixture: ComponentFixture<PoulesFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoulesFinale],
      providers: [provideRouter([]), MessageService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PoulesFinale);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Test',
      description: '',
      type: 'poules_finale',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
