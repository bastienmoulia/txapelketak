import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";

import { TournamentNew } from "./tournament-new";

describe("TournamentNew", () => {
  let component: TournamentNew;
  let fixture: ComponentFixture<TournamentNew>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TournamentNew],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TournamentNew);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should start on step 1", () => {
    expect(component.currentStep()).toBe(0);
  });

  it("should have 3 steps", () => {
    expect(component.steps.length).toBe(3);
  });

  it("should have 3 tournament type options", () => {
    expect(component.typeOptions.length).toBe(3);
  });

  it("should mark step 1 as invalid when name is empty", () => {
    component.form.get("name")?.setValue("");
    expect(component.isStep1Valid()).toBe(false);
  });

  it("should mark step 1 as valid when name is filled", () => {
    component.form.get("name")?.setValue("Mon Tournoi");
    expect(component.isStep1Valid()).toBe(true);
  });

  it("should not advance to step 2 when name is empty", () => {
    component.form.get("name")?.setValue("");
    component.nextStep();
    expect(component.currentStep()).toBe(0);
  });

  it("should advance to step 2 when name is filled", () => {
    component.form.get("name")?.setValue("Mon Tournoi");
    component.nextStep();
    expect(component.currentStep()).toBe(1);
  });

  it("should go back to step 1 from step 2", () => {
    component.form.get("name")?.setValue("Mon Tournoi");
    component.nextStep();
    expect(component.currentStep()).toBe(1);
    component.previousStep();
    expect(component.currentStep()).toBe(0);
  });

  it("should not go below step 0 when calling previousStep", () => {
    component.previousStep();
    expect(component.currentStep()).toBe(0);
  });

  it("should add a team", () => {
    component.teamInput.set("Équipe A");
    component.addTeam("Équipe A");
    expect(component.teams).toContain("Équipe A");
  });

  it("should not add a duplicate team", () => {
    component.addTeam("Équipe A");
    component.addTeam("Équipe A");
    expect(component.teams.filter((t) => t === "Équipe A").length).toBe(1);
  });

  it("should remove a team", () => {
    component.addTeam("Équipe A");
    component.removeTeam("Équipe A");
    expect(component.teams).not.toContain("Équipe A");
  });

  it("should add a group", () => {
    component.addGroup("Groupe 1");
    expect(component.groups).toContain("Groupe 1");
  });

  it("should not add a duplicate group", () => {
    component.addGroup("Groupe 1");
    component.addGroup("Groupe 1");
    expect(component.groups.filter((g) => g === "Groupe 1").length).toBe(1);
  });

  it("should remove a group", () => {
    component.addGroup("Groupe 1");
    component.removeGroup("Groupe 1");
    expect(component.groups).not.toContain("Groupe 1");
  });

  it("should default tournament type to poules", () => {
    expect(component.form.get("type")?.value).toBe("poules");
  });

  it("should mark step 3 as invalid when creator info is empty", () => {
    expect(component.isStep3Valid()).toBe(false);
  });

  it("should mark step 3 as valid when creator info is filled", () => {
    component.form.get("creatorUsername")?.setValue("MonPseudo");
    component.form.get("creatorEmail")?.setValue("test@example.com");
    expect(component.isStep3Valid()).toBe(true);
  });

  it("should mark step 3 as invalid when email is not valid", () => {
    component.form.get("creatorUsername")?.setValue("MonPseudo");
    component.form.get("creatorEmail")?.setValue("not-an-email");
    expect(component.isStep3Valid()).toBe(false);
  });

  it("should not submit when form is invalid", () => {
    component.onSubmit();
    expect(component.submitted()).toBe(false);
  });

  it("should submit when form is valid and show success state", () => {
    component.form.get("name")?.setValue("Mon Tournoi");
    component.form.get("type")?.setValue("poules");
    component.form.get("creatorUsername")?.setValue("MonPseudo");
    component.form.get("creatorEmail")?.setValue("test@example.com");
    component.onSubmit();
    expect(component.submitted()).toBe(true);
    expect(component.createdManageUrl()).toBeTruthy();
  });

  it("should generate a manage URL on submit", () => {
    component.form.get("name")?.setValue("Mon Tournoi");
    component.form.get("type")?.setValue("poules");
    component.form.get("creatorUsername")?.setValue("MonPseudo");
    component.form.get("creatorEmail")?.setValue("test@example.com");
    component.onSubmit();
    expect(component.createdManageUrl()).toMatch(/^\/tournaments\/.+\/manage$/);
  });
});
