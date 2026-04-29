import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { FinaleTab } from './finale-tab';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';
import { TournamentActionsService } from '../../../../shared/services/tournament-actions.service';

describe('FinaleTab', () => {
  let component: FinaleTab;
  let fixture: ComponentFixture<FinaleTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinaleTab],
      providers: [
        ...provideTranslocoTesting(),
        {
          provide: TournamentActionsService,
          useValue: {
            setFinaleSize: vi.fn(),
            generateFinale: vi.fn(),
            deleteFinaleGames: vi.fn(),
            saveFinaleGame: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FinaleTab);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
