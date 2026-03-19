import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Scores } from './scores';

describe('Scores', () => {
  let component: Scores;
  let fixture: ComponentFixture<Scores>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Scores],
    }).compileComponents();

    fixture = TestBed.createComponent(Scores);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
