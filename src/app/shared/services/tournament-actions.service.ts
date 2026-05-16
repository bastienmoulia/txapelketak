import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { MessageService } from 'primeng/api';
import { DocumentReference } from '@angular/fire/firestore';
import { FirebaseService } from './firebase.service';
import {
  DeleteGameEvent,
  GenerateAllGamesEvent,
  SaveGameEvent,
} from '../../tournaments/shared/games/games';
import { TournamentDetailStore } from '../../store/tournament-detail.store';
import { PoulesStore } from '../../store/poules.store';
import {
  DeletePouleEvent,
  SavePouleEvent,
  SaveSerieEvent,
  TeamInPouleEvent,
} from '../../tournaments/shared/phases/phases';
import { SavePlayoffsEvent } from '../../tournaments/shared/phases/playoffs-form-dialog/playoffs-form-dialog';
import { Game, Serie, Team } from '../../tournaments/models';

@Injectable()
export class TournamentActionsService {
  private firebaseService = inject(FirebaseService);
  private messageService = inject(MessageService);
  private translocoService = inject(TranslocoService);
  private tournamentDetailStore = inject(TournamentDetailStore);
  private poulesStore = inject(PoulesStore);

  async saveGame(event: SaveGameEvent): Promise<void> {
    const gameData: Omit<Game, 'ref'> = {
      refTeam1: event.refTeam1,
      refTeam2: event.refTeam2,
      scoreTeam1: event.scoreTeam1 ?? undefined,
      scoreTeam2: event.scoreTeam2 ?? undefined,
      date: event.date ?? undefined,
      referees: event.referees ?? undefined,
      comment: event.comment ?? undefined,
    };
    if (event.gameRef) {
      await this.firebaseService.updateGame(event.gameRef, gameData);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.games.edited'),
        detail: this.translocoService.translate('admin.games.editedDetail'),
      });
    } else {
      await this.firebaseService.addGameToPoule(event.pouleRef, gameData);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.games.added'),
        detail: this.translocoService.translate('admin.games.addedDetail'),
      });
    }
  }

  async saveTeam(team: Team): Promise<void> {
    const ref = this.tournamentDetailStore.tournament()?.ref;
    if (!ref) {
      if (team.ref) {
        this.poulesStore.patchTeams(
          this.poulesStore.teams().map((t) => (t.ref === team.ref ? team : t)),
        );
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.teams.edited'),
          detail: this.translocoService.translate('admin.teams.editedDetail'),
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: this.translocoService.translate('admin.teams.added'),
          detail: this.translocoService.translate('admin.teams.addedDetail'),
        });
      }
      return;
    }

    if (team.ref) {
      await this.firebaseService.updateTeamInTournament(ref, team);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.edited'),
        detail: this.translocoService.translate('admin.teams.editedDetail'),
      });
    } else {
      await this.firebaseService.addTeamToTournament(ref, team.name, team.comment);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.added'),
        detail: this.translocoService.translate('admin.teams.addedDetail'),
      });
    }
  }

  async saveTeams(teams: Team[]): Promise<void> {
    const ref = this.tournamentDetailStore.tournament()?.ref;
    if (!ref) {
      const newTeams = teams.map((team) => ({
        ...team,
        ref: { id: crypto.randomUUID() } as DocumentReference,
      }));
      this.poulesStore.patchTeams([...this.poulesStore.teams(), ...newTeams]);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.added'),
        detail: this.translocoService.translate('admin.teams.addedDetail'),
      });
      return;
    }

    for (const team of teams) {
      await this.firebaseService.addTeamToTournament(ref, team.name);
    }
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.added'),
      detail: this.translocoService.translate('admin.teams.addedDetail'),
    });
  }

  async deleteTeam(team: Team): Promise<void> {
    const ref = this.tournamentDetailStore.tournament()?.ref;
    if (!ref) {
      this.poulesStore.patchTeams(this.poulesStore.teams().filter((t) => t.ref.id !== team.ref.id));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.teams.deleted'),
        detail: this.translocoService.translate('admin.teams.deletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteTeamFromTournament(ref, team.ref.id);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.teams.deleted'),
      detail: this.translocoService.translate('admin.teams.deletedDetail'),
    });
  }

  // ── Serie / Poule actions ──────────────────────────────────────

  async saveSerie(event: SaveSerieEvent): Promise<DocumentReference | undefined> {
    const tournamentRef = this.tournamentDetailStore.tournament()?.ref;
    if (!tournamentRef) {
      if (event.ref) {
        this.poulesStore.patchSeries(
          this.poulesStore
            .series()
            .map((s) => (s.ref === event.ref ? { ...s, name: event.name } : s)),
        );
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.serieEdited'),
          detail: this.translocoService.translate('admin.poules.serieEditedDetail'),
        });
      } else {
        this.poulesStore.patchSeries([
          ...this.poulesStore.series(),
          { name: event.name, poules: [], ref: null as unknown as DocumentReference },
        ]);
        this.messageService.add({
          severity: 'success',
          summary: this.translocoService.translate('admin.poules.serieAdded'),
          detail: this.translocoService.translate('admin.poules.serieAddedDetail'),
        });
      }
      return event.ref;
    }

    if (event.ref) {
      await this.firebaseService.updateSerieInTournament(event.ref, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieEdited'),
        detail: this.translocoService.translate('admin.poules.serieEditedDetail'),
      });
      return event.ref;
    } else {
      const serieRef = await this.firebaseService.addSeriesToTournament(tournamentRef, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieAdded'),
        detail: this.translocoService.translate('admin.poules.serieAddedDetail'),
      });
      return serieRef;
    }
  }

  async deleteSerie(serie: Serie): Promise<void> {
    const tournamentRef = this.tournamentDetailStore.tournament()?.ref;
    if (!tournamentRef) {
      this.poulesStore.patchSeries(this.poulesStore.series().filter((s) => s.ref !== serie.ref));
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.serieDeleted'),
        detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
      });
      return;
    }

    await this.firebaseService.deleteSerieFromTournament(serie.ref);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.serieDeleted'),
      detail: this.translocoService.translate('admin.poules.serieDeletedDetail'),
    });
  }

  async savePoule(event: SavePouleEvent): Promise<DocumentReference> {
    if (event.ref) {
      await this.firebaseService.updatePouleInSerie(event.ref, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.pouleEdited'),
        detail: this.translocoService.translate('admin.poules.pouleEditedDetail'),
      });
      return event.ref;
    } else {
      const pouleRef = await this.firebaseService.addPouleToSerie(event.serieRef, event.name);
      this.messageService.add({
        severity: 'success',
        summary: this.translocoService.translate('admin.poules.pouleAdded'),
        detail: this.translocoService.translate('admin.poules.pouleAddedDetail'),
      });
      return pouleRef;
    }
  }

  async deletePoule(event: DeletePouleEvent): Promise<void> {
    await this.firebaseService.deletePouleFromSerie(event.poule.ref);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.pouleDeleted'),
      detail: this.translocoService.translate('admin.poules.pouleDeletedDetail'),
    });
  }

  async addTeamToPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamAdded'),
      detail: this.translocoService.translate('admin.poules.teamAddedDetail'),
    });
  }

  async addTeamToPouleSilent(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.addTeamRefToPoule(event.poule.ref, event.teamRef);
  }

  async removeTeamFromPoule(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.poules.teamRemoved'),
      detail: this.translocoService.translate('admin.poules.teamRemovedDetail'),
    });
  }

  async removeTeamFromPouleSilent(event: TeamInPouleEvent): Promise<void> {
    await this.firebaseService.removeTeamRefFromPoule(event.poule.ref, event.teamRef);
  }

  // ── Game actions ───────────────────────────────────────────────

  async deleteGame(event: DeleteGameEvent): Promise<void> {
    await this.firebaseService.deleteGameFromPoule(event.gameRef);
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.deleted'),
      detail: this.translocoService.translate('admin.games.deletedDetail'),
    });
  }

  async generateAllGames(event: GenerateAllGamesEvent): Promise<void> {
    if (event.games.length === 0) {
      return;
    }

    await Promise.all(
      event.games.map((game) =>
        this.firebaseService.addGameToPoule(game.pouleRef, {
          refTeam1: game.refTeam1,
          refTeam2: game.refTeam2,
        }),
      ),
    );

    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('admin.games.generated'),
      detail: this.translocoService.translate('admin.games.generatedDetail', {
        count: event.games.length,
      }),
    });
  }

  async generatePlayoffs(event: SavePlayoffsEvent): Promise<void> {
    await this.firebaseService.generatePlayoffsForSerie(
      event.serieRef,
      event.name,
      event.size,
      event.orderedTeamRefs,
      event.matchOrganization,
    );
    const count = event.size - 1;
    this.messageService.add({
      severity: 'success',
      summary: this.translocoService.translate('playoffs.generated'),
      detail: this.translocoService.translate('playoffs.generatedDetail', { count }),
    });
  }
}
