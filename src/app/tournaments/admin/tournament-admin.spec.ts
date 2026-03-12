import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TournamentAdmin } from "./tournament-admin";

describe("TournamentAdmin", () => {
  let component: TournamentAdmin;
  let fixture: ComponentFixture<TournamentAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentAdmin],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentAdmin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
