import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminFinale } from './admin-finale';

describe('AdminFinale', () => {
  let component: AdminFinale;
  let fixture: ComponentFixture<AdminFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminFinale],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminFinale);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
