import { TournamentStatusSeverityPipe } from "./tournament-status-severity.pipe";

describe("TournamentStatusSeverityPipe", () => {
  let pipe: TournamentStatusSeverityPipe;

  beforeEach(() => {
    pipe = new TournamentStatusSeverityPipe();
  });

  it("should create", () => {
    expect(pipe).toBeTruthy();
  });

  it("should return 'success' for ongoing", () => {
    expect(pipe.transform("ongoing")).toBe("success");
  });

  it("should return 'info' for upcoming", () => {
    expect(pipe.transform("upcoming")).toBe("info");
  });

  it("should return 'secondary' for completed", () => {
    expect(pipe.transform("completed")).toBe("secondary");
  });

  it("should return 'warn' for waitingValidation", () => {
    expect(pipe.transform("waitingValidation")).toBe("warn");
  });

  it("should return 'danger' for archived", () => {
    expect(pipe.transform("archived")).toBe("danger");
  });

  it("should return 'warn' for unknown values", () => {
    expect(pipe.transform("unknown" as any)).toBe("warn");
  });
});
