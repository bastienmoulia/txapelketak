import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

import { Types } from './types';
import { provideRouter } from '@angular/router';

describe('Types', () => {
  let component: Types;
  let fixture: ComponentFixture<Types>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Types],
      providers: [...provideTranslocoTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Types);
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
