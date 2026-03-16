import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPoules } from './admin-poules';
import { provideTranslocoTesting } from '../../../testing/transloco-testing.providers';

describe('AdminPoules', () => {
  let component: AdminPoules;
  let fixture: ComponentFixture<AdminPoules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoules],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoules);
    fixture.componentRef.setInput('tournament', {
      id: 1,
      name: 'Tournoi test',
      description: '',
      type: 'poules',
      status: 'paused',
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
