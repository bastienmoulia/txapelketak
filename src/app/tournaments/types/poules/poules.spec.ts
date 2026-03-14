import { ComponentFixture, TestBed } from "@angular/core/testing";

import { Poules } from "./poules";

describe("Poules", () => {
  let component: Poules;
  let fixture: ComponentFixture<Poules>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Poules],
    }).compileComponents();

    fixture = TestBed.createComponent(Poules);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
