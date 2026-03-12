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
    const table = compiled.querySelector("p-table");
    expect(table).toBeTruthy();
  });

  it("should have 0 tournaments by default (no Firestore in tests)", () => {
    expect(component.tournaments().length).toBe(0);
  });

  it("should have 0 recent tournaments by default (no Firestore in tests)", () => {
    expect(component.recentTournaments().length).toBe(0);
  });

  it("should limit recentTournaments to 5", () => {
    component.tournaments.set([
      { id: "1", name: "T1", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-01" },
      { id: "2", name: "T2", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-02" },
      { id: "3", name: "T3", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-03" },
      { id: "4", name: "T4", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-04" },
      { id: "5", name: "T5", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-05" },
      { id: "6", name: "T6", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-06" },
    ]);
    expect(component.recentTournaments().length).toBe(5);
  });

  it("should display the 5 most recently created tournaments", () => {
    component.tournaments.set([
      { id: "1", name: "T1", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-01" },
      { id: "2", name: "T2", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-02" },
      { id: "3", name: "T3", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-03" },
      { id: "4", name: "T4", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-04" },
      { id: "5", name: "T5", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-05" },
      { id: "6", name: "T6", description: "", type: "poules", status: "upcoming", createdAt: "2024-01-06" },
    ]);
    const recent = component.recentTournaments();
    expect(recent[0].id).toBe("6");
    expect(recent[4].id).toBe("2");
  });

  it("should display 6 feature cards", () => {
    expect(component.features().length).toBe(6);
  });

  it("should return correct status label", () => {
    expect(component.statusLabel("ongoing")).toBe("En cours");
    expect(component.statusLabel("upcoming")).toBe("À venir");
    expect(component.statusLabel("completed")).toBe("Terminé");
    expect(component.statusLabel("archived")).toBe("Archivé");
    expect(component.statusLabel("waitingValidation")).toBe(
      "En attente de validation",
    );
  });

  it("should return correct status severity", () => {
    expect(component.statusSeverity("ongoing")).toBe("success");
    expect(component.statusSeverity("upcoming")).toBe("info");
    expect(component.statusSeverity("completed")).toBe("secondary");
  });
});
