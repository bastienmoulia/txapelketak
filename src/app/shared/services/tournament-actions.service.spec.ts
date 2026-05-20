import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DocumentReference } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { TranslocoService } from '@jsverse/transloco';

import { TournamentActionsService } from './tournament-actions.service';
import { FirebaseService } from './firebase.service';
import { TournamentDetailStore } from '../../store/tournament-detail.store';
import { PoulesStore } from '../../store/poules.store';

describe('TournamentActionsService', () => {
  const addGameToPoule = vi.fn();
  const updateGame = vi.fn();
  const addMessage = vi.fn();

  const pouleRef = { id: 'poule-1', path: 'tournaments/t1/poules/p1' } as DocumentReference;
  const team1Ref = { id: 'team-1', path: 'tournaments/t1/teams/team-1' } as DocumentReference;
  const team2Ref = { id: 'team-2', path: 'tournaments/t1/teams/team-2' } as DocumentReference;

  let service: TournamentActionsService;

  beforeEach(() => {
    addGameToPoule.mockReset();
    updateGame.mockReset();
    addMessage.mockReset();

    TestBed.configureTestingModule({
      providers: [
        TournamentActionsService,
        {
          provide: FirebaseService,
          useValue: {
            addGameToPoule,
            updateGame,
          },
        },
        {
          provide: MessageService,
          useValue: {
            add: addMessage,
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            translate: vi.fn((key: string) => key),
          },
        },
        {
          provide: TournamentDetailStore,
          useValue: {
            tournament: () => null,
          },
        },
        {
          provide: PoulesStore,
          useValue: {
            teams: () => [],
            patchTeams: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(TournamentActionsService);
  });

  it('should pass team references when adding a game', async () => {
    await service.saveGame({
      pouleRef,
      refTeam1: team1Ref,
      refTeam2: team2Ref,
      scoreTeam1: 13,
      scoreTeam2: 11,
      comment: 'test',
    });

    expect(addGameToPoule).toHaveBeenCalledWith(
      pouleRef,
      expect.objectContaining({
        refTeam1: team1Ref,
        refTeam2: team2Ref,
        scoreTeam1: 13,
        scoreTeam2: 11,
        comment: 'test',
      }),
    );
  });
});