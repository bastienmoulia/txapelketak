import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { ConfirmationService, MessageService } from 'primeng/api';

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
        ConfirmationService,
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

  it('should include team comment in exported yaml data', () => {
    fixture.componentRef.setInput('teams', [
      {
        ref: { id: 'team-1' } as DocumentReference,
        name: 'Team A',
        comment: 'Important note',
      } as never,
    ]);
    fixture.detectChanges();

    const exportData = (
      component as unknown as { buildExportData: () => unknown }
    ).buildExportData() as {
      teams: { id: string; name: string; comment?: string }[];
    };

    expect(exportData.teams).toEqual([
      {
        id: 'team-1',
        name: 'Team A',
        comment: 'Important note',
      },
    ]);
  });

  it('should not include empty team comment in exported yaml data', () => {
    fixture.componentRef.setInput('teams', [
      {
        ref: { id: 'team-2' } as DocumentReference,
        name: 'Team B',
      } as never,
    ]);
    fixture.detectChanges();

    const exportData = (
      component as unknown as { buildExportData: () => unknown }
    ).buildExportData() as {
      teams: { id: string; name: string; comment?: string }[];
    };

    expect(exportData.teams).toEqual([
      {
        id: 'team-2',
        name: 'Team B',
      },
    ]);
    expect('comment' in exportData.teams[0]).toBe(false);
  });
});
