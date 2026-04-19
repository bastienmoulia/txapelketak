import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { DocumentReference } from '@angular/fire/firestore';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { DialogService } from 'primeng/dynamicdialog';

import { AdminUsers } from './admin-users';

describe('AdminUsers', () => {
  let component: AdminUsers;
  let fixture: ComponentFixture<AdminUsers>;
  const firebaseServiceStub = {
    isAvailable: vi.fn(() => false),
    getUsersByTournament: vi.fn(async () => []),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsers],
      providers: [
        MessageService,
        DialogService,
        ...provideTranslocoTesting(),
        { provide: FirebaseService, useValue: firebaseServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsers);
    fixture.componentRef.setInput('tournament', {
      ref: { id: 'tournament-1' } as DocumentReference,
      name: 'Tournament test',
      description: 'Tournament description',
      type: 'poules',
      status: 'ongoing',
      createdAt: '2026-03-21T00:00:00.000Z',
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
