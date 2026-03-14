import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminPoulesFinale } from './admin-poules-finale';

describe('AdminPoulesFinale', () => {
  let component: AdminPoulesFinale;
  let fixture: ComponentFixture<AdminPoulesFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminPoulesFinale],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPoulesFinale);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
