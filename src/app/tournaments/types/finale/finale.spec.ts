import { ComponentFixture, TestBed } from "@angular/core/testing";

import { Finale } from "./finale";

describe("Finale", () => {
  let component: Finale;
  let fixture: ComponentFixture<Finale>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Finale],
    }).compileComponents();

    fixture = TestBed.createComponent(Finale);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
