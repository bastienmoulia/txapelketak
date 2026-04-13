import { TestBed } from '@angular/core/testing';
import { TournamentStatusLabelPipe } from './tournament-status-label.pipe';
import { provideTranslocoTesting } from '../../testing/transloco-testing.providers';

describe('TournamentStatusLabelPipe', () => {
  let pipe: TournamentStatusLabelPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideTranslocoTesting()],
    });
    pipe = TestBed.runInInjectionContext(() => new TournamentStatusLabelPipe());
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  it("should return 'En cours' for ongoing", () => {
    expect(pipe.transform('ongoing')).toBe('En cours');
  });

  it("should return 'Archivé' for archived", () => {
    expect(pipe.transform('archived')).toBe('Archivé');
  });

  it("should return 'En attente de validation' for waitingValidation", () => {
    expect(pipe.transform('waitingValidation')).toBe('En attente de validation');
  });

  it('should return the raw status for unknown values', () => {
    expect(pipe.transform('unknown' as any)).toBe('unknown');
  });
});
