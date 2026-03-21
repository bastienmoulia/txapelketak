import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';

import { AdminImportExport } from './admin-import-export';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { FirebaseService } from '../../../../shared/services/firebase.service';

describe('AdminImportExport', () => {
  let component: AdminImportExport;
  let fixture: ComponentFixture<AdminImportExport>;
  const firebaseServiceStub = {
    isAvailable: vi.fn(() => false),
    importTournamentData: vi.fn(async () => undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminImportExport],
      providers: [
        MessageService,
        ...provideTranslocoTesting(),
        { provide: FirebaseService, useValue: firebaseServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminImportExport);
    fixture.componentRef.setInput('tournament', {
      ref: { id: 'tournament-1' } as DocumentReference,
      name: 'Tournament test',
      description: 'Tournament description',
      type: 'poules',
      status: 'ongoing',
      createdAt: '2026-03-21T00:00:00.000Z',
    });
    fixture.componentRef.setInput('teams', []);
    fixture.componentRef.setInput('series', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
