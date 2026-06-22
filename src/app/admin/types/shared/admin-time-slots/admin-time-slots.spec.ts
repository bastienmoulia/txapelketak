import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { vi } from 'vitest';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { FirebaseService } from '../../../../shared/services/firebase.service';
import { TimeSlot } from '../../../../tournaments/models';
import { AdminTimeSlots } from './admin-time-slots';

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
}

function createTimeSlot(date: Date): TimeSlot {
  return { ref: createDocumentReference('slot-' + date.getTime()), date };
}

describe('AdminTimeSlots', () => {
  let component: AdminTimeSlots;
  let fixture: ComponentFixture<AdminTimeSlots>;
  let messageService: MessageService;

  const firebaseServiceStub = {
    addTimeSlot: vi.fn(async () => undefined),
    deleteTimeSlot: vi.fn(async () => undefined),
  };

  const tournamentRef = createDocumentReference('tournament-1');

  beforeEach(async () => {
    firebaseServiceStub.addTimeSlot.mockClear();

    await TestBed.configureTestingModule({
      imports: [AdminTimeSlots],
      providers: [
        MessageService,
        DialogService,
        ...provideTranslocoTesting(),
        { provide: FirebaseService, useValue: firebaseServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTimeSlots);
    fixture.componentRef.setInput('tournament', {
      ref: tournamentRef,
      name: 'Tournament test',
      description: '',
      type: 'poules',
      status: 'ongoing',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    fixture.componentRef.setInput('timeSlots', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add a time slot when the date is not a duplicate', async () => {
    const addSpy = vi.spyOn(messageService, 'add');
    const date = new Date('2026-06-21T10:00:00.000Z');
    component.newSlotDate.set(date);

    await component.onAddTimeSlot();

    expect(firebaseServiceStub.addTimeSlot).toHaveBeenCalledWith(tournamentRef, date);
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
  });

  it('should show a warning toast and not add when the time slot already exists', async () => {
    const existingDate = new Date('2026-06-21T10:00:00.000Z');
    fixture.componentRef.setInput('timeSlots', [createTimeSlot(existingDate)]);
    fixture.detectChanges();

    const addSpy = vi.spyOn(messageService, 'add');
    component.newSlotDate.set(new Date(existingDate.getTime()));

    await component.onAddTimeSlot();

    expect(firebaseServiceStub.addTimeSlot).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn' }),
    );
  });

  it('should not add when newSlotDate is null', async () => {
    component.newSlotDate.set(null);

    await component.onAddTimeSlot();

    expect(firebaseServiceStub.addTimeSlot).not.toHaveBeenCalled();
  });
});
