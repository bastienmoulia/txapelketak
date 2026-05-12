import { DocumentReference } from '@angular/fire/firestore';

import {
  buildTournamentCalendar,
  buildTournamentCalendarFilename,
  buildTournamentCalendarUrl,
  DEFAULT_GAME_DURATION_MINUTES,
} from './tournament-calendar';

describe('tournament calendar helpers', () => {
  it('should build a stable calendar url for a tournament', () => {
    expect(buildTournamentCalendarUrl('https://txapelketak.web.app/', 'tournament-1')).toBe(
      'https://txapelketak.web.app/tournaments/tournament-1/calendar.ics',
    );
  });

  it('should build an ics calendar with scheduled poule and finale games', () => {
    const calendar = buildTournamentCalendar({
      tournament: {
        ref: createDocumentReference('tournament-1'),
        name: 'Spring Cup',
        gameDurationMinutes: 45,
      },
      teams: [
        { ref: createDocumentReference('team-1'), name: 'A Team' },
        { ref: createDocumentReference('team-2'), name: 'B Team' },
      ] as never,
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule 1',
              refTeams: [createDocumentReference('team-1'), createDocumentReference('team-2')],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: createDocumentReference('team-1'),
                  refTeam2: createDocumentReference('team-2'),
                  date: new Date(Date.UTC(2026, 4, 1, 10, 0)),
                },
                {
                  ref: createDocumentReference('game-2'),
                  refTeam1: createDocumentReference('team-1'),
                  refTeam2: createDocumentReference('team-2'),
                },
              ],
            },
          ],
          finaleGames: [
            {
              ref: createDocumentReference('finale-1'),
              name: 'Finale',
              round: 'Finale',
              roundOrder: 1,
              matchNumber: 1,
              team1Placeholder: 'Winner 1',
              team2Placeholder: 'Winner 2',
              date: new Date(Date.UTC(2026, 4, 2, 15, 30)),
            },
          ],
        },
      ],
    });

    expect(calendar).toContain('BEGIN:VCALENDAR');
    expect(calendar).toContain('SUMMARY:A Team - B Team');
    expect(calendar).toContain('SUMMARY:Winner 1 - Winner 2');
    expect(calendar).toContain('DTSTART:20260501T100000Z');
    expect(calendar).toContain('DTEND:20260501T104500Z');
    expect(calendar).not.toContain('game-2');
  });

  it('should fall back to the default duration when none is configured', () => {
    const calendar = buildTournamentCalendar({
      tournament: {
        ref: createDocumentReference('tournament-1'),
        name: 'Fallback Cup',
        gameDurationMinutes: null,
      },
      teams: [
        { ref: createDocumentReference('team-1'), name: 'Alpha' },
        { ref: createDocumentReference('team-2'), name: 'Beta' },
      ] as never,
      series: [
        {
          ref: createDocumentReference('serie-1'),
          name: 'Serie A',
          poules: [
            {
              ref: createDocumentReference('poule-1'),
              name: 'Poule 1',
              refTeams: [createDocumentReference('team-1'), createDocumentReference('team-2')],
              games: [
                {
                  ref: createDocumentReference('game-1'),
                  refTeam1: createDocumentReference('team-1'),
                  refTeam2: createDocumentReference('team-2'),
                  date: new Date(Date.UTC(2026, 4, 1, 10, 0)),
                },
              ],
            },
          ],
          finaleGames: [],
        },
      ],
    });

    expect(calendar).toContain(
      `DTEND:${formatUtcDate(new Date(Date.UTC(2026, 4, 1, 10, DEFAULT_GAME_DURATION_MINUTES)))}`,
    );
  });

  it('should build a safe download filename', () => {
    expect(buildTournamentCalendarFilename('Tournoi de Printemps 2026 !')).toBe(
      'tournoi_de_printemps_2026_calendar.ics',
    );
  });
});

function createDocumentReference(id: string): DocumentReference {
  return { id } as DocumentReference;
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
