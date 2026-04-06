import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminPoulesFinale } from './admin-poules-finale';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';

describe('AdminPoulesFinale', () => {
  let component: AdminPoulesFinale;
  let fixture: ComponentFixture<AdminPoulesFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoulesFinale],
      providers: [provideRouter([]), MessageService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoulesFinale);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Test Tournament',
      description: '',
      type: 'poules_finale',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      data: { numberOfTeams: 4 },
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
