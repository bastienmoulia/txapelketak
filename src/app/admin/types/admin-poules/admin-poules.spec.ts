import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPoules } from './admin-poules';

describe('AdminPoules', () => {
  let component: AdminPoules;
  let fixture: ComponentFixture<AdminPoules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoules],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoules);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
