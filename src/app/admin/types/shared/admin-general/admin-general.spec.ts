import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';

import { AdminGeneral } from './admin-general';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('AdminGeneral', () => {
  let component: AdminGeneral;
  let fixture: ComponentFixture<AdminGeneral>;
  const firebaseServiceStub = {
    updateTournamentInfo: vi.fn(async () => undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGeneral],
      providers: [
        MessageService,
        ...provideTranslocoTesting(),
        { provide: FirebaseService, useValue: firebaseServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGeneral);
    fixture.componentRef.setInput('tournament', {
      ref: createDocumentReference('tournament-1'),
      name: 'Tournament test',
      description: 'Tournament description',
      gameDurationMinutes: 75,
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

  it('should expose the public calendar url', () => {
    const calendarInput = fixture.nativeElement.querySelector('#tournament-calendar-url');
    expect(calendarInput.value).toContain('/tournaments/tournament-1/calendar.ics');
  });

  it('should persist the configured game duration', async () => {
    component.onEdit();
    component.gameDurationMinutes.set(90);

    await component.onSave();

    expect(firebaseServiceStub.updateTournamentInfo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tournament-1' }),
      expect.objectContaining({
        name: 'Tournament test',
        description: 'Tournament description',
        gameDurationMinutes: 90,
      }),
    );
  });
});

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
}
