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

  it('should not include tournament type in exported yaml data when absent', () => {
    fixture.componentRef.setInput('tournament', {
      ref: { id: 'tournament-1' } as DocumentReference,
      name: 'Tournament test',
      description: 'Tournament description',
      status: 'ongoing',
      createdAt: '2026-03-21T00:00:00.000Z',
    });
    fixture.detectChanges();

    const exportData = (
      component as unknown as { buildExportData: () => unknown }
    ).buildExportData() as {
      tournament: { type?: string };
    };

    expect('type' in exportData.tournament).toBe(false);
  });

  it('should include playoffs in exported yaml data', () => {
    const team1Ref = { id: 'team-1' } as DocumentReference;
    const team2Ref = { id: 'team-2' } as DocumentReference;

    fixture.componentRef.setInput('series', [
      {
        ref: { id: 'serie-1' } as DocumentReference,
        name: 'Serie A',
        poules: [],
        playoffs: [
          {
            ref: { id: 'playoff-1' } as DocumentReference,
            name: 'Tableau principal',
            size: 2,
            orderedTeamRefs: [team1Ref, team2Ref],
            games: [
              {
                ref: { id: 'game-1' } as DocumentReference,
                roundSize: 2,
                matchNumber: 1,
                refTeam1: team1Ref,
                refTeam2: team2Ref,
                scoreTeam1: 10,
                scoreTeam2: 8,
              },
            ],
          },
        ],
      } as never,
    ]);
    fixture.detectChanges();

    const exportData = (
      component as unknown as { buildExportData: () => unknown }
    ).buildExportData() as {
      series: {
        playoffs?: {
          name: string;
          size: number;
          orderedTeams: string[];
          games: { roundSize: number; matchNumber: number; team1?: string; team2?: string }[];
        }[];
      }[];
    };

    expect(exportData.series[0].playoffs).toEqual([
      {
        name: 'Tableau principal',
        size: 2,
        orderedTeams: ['team-1', 'team-2'],
        games: [
          {
            roundSize: 2,
            matchNumber: 1,
            team1: 'team-1',
            team2: 'team-2',
            score1: 10,
            score2: 8,
          },
        ],
      },
    ]);
  });
});
