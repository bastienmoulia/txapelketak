import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { TournamentList } from "./tournament-list";

describe("TournamentList", () => {
  let component: TournamentList;
  let fixture: ComponentFixture<TournamentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentList],
      providers: [provideRouter([])],
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
    const buttons = compiled.querySelectorAll("p-button");
    const hasCreateButton = Array.from(buttons).some((btn) =>
      btn.getAttribute("label")?.includes("Créer un tournoi"),
    );
    expect(hasCreateButton).toBe(true);
  });

  it("should display the header", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector("app-header")).toBeTruthy();
  });
});
