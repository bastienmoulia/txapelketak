import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminFinale } from './admin-finale';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';

describe('AdminFinale', () => {
  let component: AdminFinale;
  let fixture: ComponentFixture<AdminFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFinale],
      providers: [provideRouter([]), MessageService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFinale);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Tournoi test',
      description: '',
      type: 'finale',
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
