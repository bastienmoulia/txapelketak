import { Tournament } from '../../home/tournament.interface';
import { FinaleGame, Game, Serie } from '../../tournaments/types/poules/poules';
import { Team } from '../../tournaments/types/shared/teams/teams';

export const DEFAULT_GAME_DURATION_MINUTES = 60;

interface TournamentCalendarEvent {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
}

export function buildTournamentCalendarUrl(origin: string, tournamentId: string): string {
  const path = `/tournaments/${encodeURIComponent(tournamentId)}/calendar.ics`;
  return origin ? `${origin.replace(/\/$/, '')}${path}` : path;
}

export function buildTournamentCalendarFilename(tournamentName: string): string {
  const safeName = tournamentName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return `${safeName || 'tournament'}_calendar.ics`;
}

export function normalizeGameDurationMinutes(value: number | null | undefined): number {
  return Number.isInteger(value) && (value as number) > 0
    ? (value as number)
    : DEFAULT_GAME_DURATION_MINUTES;
}

export function buildTournamentCalendar(params: {
  tournament: Pick<Tournament, 'name' | 'gameDurationMinutes'> & { ref?: { id: string } };
  teams: Team[];
  series: Serie[];
}): string {
  const teamNameById = new Map(params.teams.map((team) => [team.ref.id, team.name]));
  const gameDurationMinutes = normalizeGameDurationMinutes(params.tournament.gameDurationMinutes);
  const events = params.series
    .flatMap((serie) => [
      ...buildPouleEvents({
        tournamentName: params.tournament.name,
        tournamentId: params.tournament.ref?.id ?? params.tournament.name,
        serie,
        teamNameById,
        gameDurationMinutes,
      }),
      ...buildFinaleEvents({
        tournamentName: params.tournament.name,
        tournamentId: params.tournament.ref?.id ?? params.tournament.name,
        serie,
        teamNameById,
        gameDurationMinutes,
      }),
    ])
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  return buildCalendarContent(params.tournament.name, events);
}

function buildPouleEvents(params: {
  tournamentName: string;
  tournamentId: string;
  serie: Serie;
  teamNameById: Map<string, string>;
  gameDurationMinutes: number;
}): TournamentCalendarEvent[] {
  return (params.serie.poules ?? []).flatMap((poule) =>
    (poule.games ?? [])
      .filter(hasGameDate)
      .map((game) => {
        const team1Name = params.teamNameById.get(game.refTeam1.id) ?? game.refTeam1.id;
        const team2Name = params.teamNameById.get(game.refTeam2.id) ?? game.refTeam2.id;
        return createCalendarEvent({
          uid: `${params.tournamentId}-${game.ref.id}`,
          start: game.date,
          gameDurationMinutes: params.gameDurationMinutes,
          summary: `${team1Name} - ${team2Name}`,
          descriptionLines: [
            params.tournamentName,
            `${params.serie.name} · ${poule.name}`,
            ...(game.referees?.length ? [`Referees: ${game.referees.join(', ')}`] : []),
            ...(game.comment ? [game.comment] : []),
          ],
        });
      }),
  );
}

function buildFinaleEvents(params: {
  tournamentName: string;
  tournamentId: string;
  serie: Serie;
  teamNameById: Map<string, string>;
  gameDurationMinutes: number;
}): TournamentCalendarEvent[] {
  return (params.serie.finaleGames ?? [])
    .filter(hasFinaleGameDate)
    .map((game) => {
      const team1Name =
        (game.refTeam1 ? params.teamNameById.get(game.refTeam1.id) : undefined) ??
        game.team1Placeholder ??
        'TBD';
      const team2Name =
        (game.refTeam2 ? params.teamNameById.get(game.refTeam2.id) : undefined) ??
        game.team2Placeholder ??
        'TBD';
      return createCalendarEvent({
        uid: `${params.tournamentId}-${game.ref.id}`,
        start: game.date,
        gameDurationMinutes: params.gameDurationMinutes,
        summary: `${team1Name} - ${team2Name}`,
        descriptionLines: [
          params.tournamentName,
          `${params.serie.name} · ${game.round}`,
          game.name,
          ...(game.referees?.length ? [`Referees: ${game.referees.join(', ')}`] : []),
        ],
      });
    });
}

function createCalendarEvent(params: {
  uid: string;
  start: Date;
  gameDurationMinutes: number;
  summary: string;
  descriptionLines: string[];
}): TournamentCalendarEvent {
  return {
    uid: params.uid,
    start: params.start,
    end: new Date(params.start.getTime() + params.gameDurationMinutes * 60_000),
    summary: params.summary,
    description: params.descriptionLines.filter(Boolean).join('\n'),
  };
}

function buildCalendarContent(
  tournamentName: string,
  events: TournamentCalendarEvent[],
  generatedAt = new Date(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Txapelketak//Tournament Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeCalendarText(tournamentName)}`,
    ...events.flatMap((event) => [
      'BEGIN:VEVENT',
      `UID:${escapeCalendarText(event.uid)}`,
      `DTSTAMP:${formatUtcDate(generatedAt)}`,
      `DTSTART:${formatUtcDate(event.start)}`,
      `DTEND:${formatUtcDate(event.end)}`,
      `SUMMARY:${escapeCalendarText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeCalendarText(event.description)}`] : []),
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];

  return `${lines.join('\r\n')}\r\n`;
}

function formatUtcDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function escapeCalendarText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function hasGameDate(game: Game): game is Game & { date: Date } {
  return game.date instanceof Date && !Number.isNaN(game.date.getTime());
}

function hasFinaleGameDate(game: FinaleGame): game is FinaleGame & { date: Date } {
  return game.date instanceof Date && !Number.isNaN(game.date.getTime());
}
