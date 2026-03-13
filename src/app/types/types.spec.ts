import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Types } from './types';

describe('Types', () => {
  let component: Types;
  let fixture: ComponentFixture<Types>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Types],
    }).compileComponents();

    fixture = TestBed.createComponent(Types);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
