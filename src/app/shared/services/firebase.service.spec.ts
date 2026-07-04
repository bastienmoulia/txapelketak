import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { FirebaseService } from './firebase.service';

describe('FirebaseService history helpers', () => {
  let service: FirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseService);
  });

  it('should parse score history entries and ignore invalid records', () => {
    const parsed = service.parseGameScoreHistory([
      {
        changedAt: '2026-07-04T10:00:00.000Z',
        changedBy: { username: 'admin', role: 'admin' },
        changes: [
          { field: 'scoreTeam1', before: 8, after: 10 },
          { field: 'unknown', before: 'x', after: 'y' },
        ],
      },
      {
        changedAt: 'invalid-date',
        changes: [{ field: 'scoreTeam2', before: 9, after: 11 }],
      },
      {
        changedAt: '2026-07-04T11:00:00.000Z',
        changes: [],
      },
    ]);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].changedBy).toEqual({ username: 'admin', role: 'admin' });
    expect(parsed[0].changes).toEqual([
      { field: 'scoreTeam1', before: 8, after: 10 },
      { field: 'other', before: 'x', after: 'y' },
    ]);
  });

  it('should compute only meaningful history changes', () => {
    const previous = {
      scoreTeam1: 8,
      scoreTeam2: 10,
      comment: 'note',
      referees: ['Ref A'],
    };
    const next = {
      scoreTeam1: 12,
      scoreTeam2: 10,
      comment: ' note ',
      referees: ['Ref A', 'Ref B'],
    };

    const changes = (
      service as unknown as {
        buildGameHistoryChanges: (
          previousData: Record<string, unknown>,
          gameData: Record<string, unknown>,
        ) => { field: string; before: unknown; after: unknown }[];
      }
    ).buildGameHistoryChanges(previous, next);

    expect(changes).toEqual([
      { field: 'scoreTeam1', before: 8, after: 12 },
      { field: 'referees', before: 'Ref A', after: 'Ref A, Ref B' },
    ]);
  });
});
