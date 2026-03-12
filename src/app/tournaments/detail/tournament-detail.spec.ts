import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { ActivatedRoute } from "@angular/router";

import { TournamentDetail } from "./tournament-detail";

describe("TournamentDetail", () => {
  let component: TournamentDetail;
  let fixture: ComponentFixture<TournamentDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => "test-id-123" } },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should read the tournament id from the route", () => {
    expect(component.tournamentId()).toBe("test-id-123");
  });

  it("should show not found when tournament does not exist", () => {
    expect(component.notFound()).toBe(true);
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
    expect(component.statusSeverity("waitingValidation")).toBe("warn");
    expect(component.statusSeverity("archived")).toBe("danger");
  });

  it("should return correct type label", () => {
    expect(component.typeLabel("poules")).toBe("Poules");
    expect(component.typeLabel("finale")).toBe("Phase finale");
    expect(component.typeLabel("poules+finale")).toBe("Poules + Phase finale");
  });
});
