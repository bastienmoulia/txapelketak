import { TournamentStatusLabelPipe } from "./tournament-status-label.pipe";

describe("TournamentStatusLabelPipe", () => {
  let pipe: TournamentStatusLabelPipe;

  beforeEach(() => {
    pipe = new TournamentStatusLabelPipe();
  });

  it("should create", () => {
    expect(pipe).toBeTruthy();
  });

  it("should return 'En cours' for ongoing", () => {
    expect(pipe.transform("ongoing")).toBe("En cours");
  });

  it("should return 'À venir' for upcoming", () => {
    expect(pipe.transform("upcoming")).toBe("À venir");
  });

  it("should return 'Terminé' for completed", () => {
    expect(pipe.transform("completed")).toBe("Terminé");
  });

  it("should return 'Archivé' for archived", () => {
    expect(pipe.transform("archived")).toBe("Archivé");
  });

  it("should return 'En attente de validation' for waitingValidation", () => {
    expect(pipe.transform("waitingValidation")).toBe(
      "En attente de validation",
    );
  });

  it("should return the raw status for unknown values", () => {
    expect(pipe.transform("unknown" as any)).toBe("unknown");
  });
});
