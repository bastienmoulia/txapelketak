import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DocumentReference } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';

import { AdminPoules } from './admin-poules';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';
import { TournamentActionsService } from '../../../shared/services/tournament-actions.service';

describe('AdminPoules', () => {
  let component: AdminPoules;
  let fixture: ComponentFixture<AdminPoules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoules],
      providers: [provideRouter([]), MessageService, TournamentActionsService, ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoules);
    fixture.componentRef.setInput('tournament', {
      ref: { id: '1' } as DocumentReference,
      name: 'Tournoi test',
      description: '',
      type: 'poules',
      status: 'ongoing',
      createdAt: new Date().toISOString(),
      data: { teams: [] },
    });
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
