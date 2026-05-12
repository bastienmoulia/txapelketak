import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TooltipModule } from 'primeng/tooltip';
import { DocumentReference } from '@angular/fire/firestore';
import { FirebaseService } from '../../shared/services/firebase.service';
import { FinaleGame, parseFirestoreDate, Poule, Serie } from '../types/poules/poules';
import { Team } from '../types/shared/teams/teams';
import {
  buildTournamentCalendar,
  buildTournamentCalendarFilename,
} from '../../shared/calendar/tournament-calendar';

@Component({
  selector: 'app-tournament-calendar-feed',
  imports: [ButtonModule, MessageModule, TooltipModule, TranslocoModule],
  templateUrl: './tournament-calendar-feed.html',
  styleUrl: './tournament-calendar-feed.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TournamentCalendarFeed implements OnDestroy {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly firebaseService = inject(FirebaseService);

  readonly loading = signal(true);
  readonly errorKey = signal<string | null>(null);
  readonly downloadUrl = signal<string | null>(null);
  readonly downloadFilename = signal('tournament_calendar.ics');

  private objectUrl: string | null = null;

  constructor() {
    void this.loadCalendar();
  }

  ngOnDestroy(): void {
    this.revokeDownloadUrl();
  }

  onDownload(): void {
    const url = this.downloadUrl();
    if (!url) {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = this.downloadFilename();
    link.click();
  }

  private async loadCalendar(): Promise<void> {
    const tournamentId = this.activatedRoute.snapshot.paramMap.get('tournamentId');

    if (!tournamentId || !this.firebaseService.isAvailable()) {
      this.errorKey.set('tournaments.calendar.unavailable');
      this.loading.set(false);
      return;
    }

    const tournament = await this.firebaseService.getTournamentById(tournamentId);
    if (!tournament) {
      this.errorKey.set('tournaments.calendar.notFound');
      this.loading.set(false);
      return;
    }

    const [teams, series] = await Promise.all([
      this.loadTeams(tournament.ref),
      this.loadSeries(tournament.ref),
    ]);

    const calendarContent = buildTournamentCalendar({ tournament, teams, series });
    const hasEvents = calendarContent.includes('BEGIN:VEVENT');
    if (!hasEvents) {
      this.errorKey.set('tournaments.calendar.noScheduledGames');
      this.loading.set(false);
      return;
    }

    this.revokeDownloadUrl();
    this.objectUrl = URL.createObjectURL(
      new Blob([calendarContent], { type: 'text/calendar;charset=utf-8' }),
    );
    this.downloadUrl.set(this.objectUrl);
    this.downloadFilename.set(buildTournamentCalendarFilename(tournament.name));
    this.loading.set(false);
    this.onDownload();
  }

  private async loadTeams(tournamentRef: DocumentReference): Promise<Team[]> {
    const teamDocs = await this.firebaseService.getTournamentCollection(tournamentRef, 'teams');
    return teamDocs.map(({ ref, data }) => ({
      ref,
      ...(data as Omit<Team, 'ref'>),
    }));
  }

  private async loadSeries(tournamentRef: DocumentReference): Promise<Serie[]> {
    const seriesDocs = await this.firebaseService.getTournamentCollection(tournamentRef, 'series');

    return Promise.all(
      seriesDocs.map(async ({ ref, data }) => {
        const [poules, finaleGames] = await Promise.all([
          this.loadPoules(ref),
          this.loadFinaleGames(ref),
        ]);

        return {
          ref,
          name: (data as { name?: string }).name ?? '',
          poules,
          finaleGames,
        } satisfies Serie;
      }),
    );
  }

  private async loadPoules(serieRef: DocumentReference): Promise<Poule[]> {
    const pouleDocs = await this.firebaseService.getCollectionFromDocumentRef(serieRef, 'poules');

    return Promise.all(
      pouleDocs.map(async ({ ref, data }) => {
        const games = await this.firebaseService.getCollectionFromDocumentRef(ref, 'games');
        const pouleData = data as { name?: string; refTeams?: DocumentReference[] };
        return {
          ref,
          name: pouleData.name ?? '',
          refTeams: pouleData.refTeams ?? [],
          games: games
            .map(({ ref: gameRef, data: gameData }) => {
              const parsedGame = gameData as {
                refTeam1: DocumentReference;
                refTeam2: DocumentReference;
                scoreTeam1?: number;
                scoreTeam2?: number;
                date?: unknown;
                referees?: string[];
                comment?: string;
              };

              if (!parsedGame.refTeam1 || !parsedGame.refTeam2) {
                return null;
              }

              return {
                ref: gameRef,
                refTeam1: parsedGame.refTeam1,
                refTeam2: parsedGame.refTeam2,
                scoreTeam1: parsedGame.scoreTeam1,
                scoreTeam2: parsedGame.scoreTeam2,
                date: parseFirestoreDate(parsedGame.date),
                referees: parsedGame.referees,
                comment: parsedGame.comment,
              };
            })
            .filter((game): game is NonNullable<typeof game> => game !== null),
        } satisfies Poule;
      }),
    );
  }

  private async loadFinaleGames(serieRef: DocumentReference): Promise<FinaleGame[]> {
    const finaleGameDocs = await this.firebaseService.getCollectionFromDocumentRef(
      serieRef,
      'finaleGames',
    );

    return finaleGameDocs.map(({ ref, data }) => {
      const finaleData = data as Omit<FinaleGame, 'ref' | 'date'> & { date?: unknown };
      return {
        ref,
        ...finaleData,
        date: parseFirestoreDate(finaleData.date),
      };
    });
  }

  private revokeDownloadUrl(): void {
    if (!this.objectUrl) {
      return;
    }

    URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
