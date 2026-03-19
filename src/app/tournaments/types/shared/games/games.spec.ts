import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Games } from './games';
import { provideTranslocoTesting } from '../../../../testing/transloco-testing.providers';

describe('Games', () => {
  let component: Games;
  let fixture: ComponentFixture<Games>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Games],
      providers: [...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Games);
    fixture.componentRef.setInput('teams', []);
    fixture.componentRef.setInput('series', []);
    fixture.detectChanges();
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
