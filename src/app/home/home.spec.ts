import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { Home } from "./home";

describe("Home", () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should display the title", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector("h1")?.textContent).toContain("Txapelketak");
  });

  it("should display a link to create a tournament", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll("p-button");
    const hasCreateButton = Array.from(buttons).some((btn) =>
      btn.getAttribute("label")?.includes("Créer un tournoi"),
    );
    expect(hasCreateButton).toBe(true);
  });

  it("should display the list of tournaments", () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll("p-table tbody tr");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("should have 3 mock tournaments by default", () => {
    expect(component.tournaments().length).toBe(3);
  });

  it("should display 3 feature cards", () => {
    expect(component.features().length).toBe(3);
  });

  it("should return correct status label", () => {
    expect(component.statusLabel("ongoing")).toBe("En cours");
    expect(component.statusLabel("upcoming")).toBe("À venir");
    expect(component.statusLabel("completed")).toBe("Terminé");
    expect(component.statusLabel("archived")).toBe("Archivé");
  });

  it("should return correct status severity", () => {
    expect(component.statusSeverity("ongoing")).toBe("success");
    expect(component.statusSeverity("upcoming")).toBe("info");
    expect(component.statusSeverity("completed")).toBe("secondary");
  });
});
