import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminTypes } from './admin-types';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

describe('AdminTypes', () => {
  let component: AdminTypes;
  let fixture: ComponentFixture<AdminTypes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminTypes],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTypes);
    fixture.componentRef.setInput('tournament', {
      id: 1,
      name: 'Test Tournoi',
      description: '',
      type: 'poules',
      status: 'paused',
      createdAt: '2024-01-01',
    });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
