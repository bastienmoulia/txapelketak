import { TournamentStatusSeverityPipe } from './tournament-status-severity.pipe';

describe('TournamentStatusSeverityPipe', () => {
  let pipe: TournamentStatusSeverityPipe;

  beforeEach(() => {
    pipe = new TournamentStatusSeverityPipe();
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it("should return 'success' for ongoing", () => {
    expect(pipe.transform('ongoing')).toBe('success');
  });

  it("should return 'danger' for waitingValidation", () => {
    expect(pipe.transform('waitingValidation')).toBe('danger');
  });

  it("should return 'info' for archived", () => {
    expect(pipe.transform('archived')).toBe('info');
  });

  it('should return null for unknown values', () => {
    expect(pipe.transform('unknown' as any)).toBeNull();
  });
});
