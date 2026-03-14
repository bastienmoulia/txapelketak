import { ComponentFixture, TestBed } from "@angular/core/testing";

import { PoulesFinale } from "./poules-finale";

describe("PoulesFinale", () => {
  let component: PoulesFinale;
  let fixture: ComponentFixture<PoulesFinale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PoulesFinale],
    }).compileComponents();

    fixture = TestBed.createComponent(PoulesFinale);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
