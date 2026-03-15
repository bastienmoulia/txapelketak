import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { TournamentList } from "./tournament-list";
import { provideTranslocoTesting } from "../../testing/transloco-testing.providers";

describe("TournamentList", () => {
  let component: TournamentList;
  let fixture: ComponentFixture<TournamentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentList],
      providers: [provideRouter([]), ...provideTranslocoTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display the title", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector("h1")?.textContent).toContain("Tournois");
  });

  it("should display the list of tournaments", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const table = compiled.querySelector("p-table");
    expect(table).toBeTruthy();
  });

  it("should have 0 tournaments by default (no Firestore in tests)", () => {
    expect(component.tournaments().length).toBe(0);
  });

  it("should display a link to create a tournament", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain("Créer un tournoi");
  });
});
