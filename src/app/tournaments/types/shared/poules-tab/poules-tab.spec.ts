import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PoulesTab } from './poules-tab';

describe('PoulesTab', () => {
  let component: PoulesTab;
  let fixture: ComponentFixture<PoulesTab>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoulesTab],
    }).compileComponents();

    fixture = TestBed.createComponent(PoulesTab);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
