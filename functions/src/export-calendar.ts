import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

const DEFAULT_MATCH_DURATION_MINUTES = 60;

function formatIcalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldIcalLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }
  const chunks: string[] = [];
  chunks.push(line.slice(0, maxLength));
  let offset = maxLength;
  while (offset < line.length) {
    chunks.push(' ' + line.slice(offset, offset + maxLength - 1));
    offset += maxLength - 1;
  }
  return chunks.join('\r\n');
}

export const exportCalendar = onRequest(
  { region: 'europe-west1', cors: true },
  async (req, res) => {
    const tournamentId = req.query['tournamentId'] as string | undefined;
    const databaseId = req.query['databaseId'] as string | undefined;
    const teamId = req.query['teamId'] as string | undefined;

    if (!tournamentId || typeof tournamentId !== 'string') {
      res.status(400).json({ error: 'tournamentId query parameter is required' });
      return;
    }

    const db = databaseId ? getFirestore(databaseId) : getFirestore();

    // Fetch tournament
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
      res.status(404).json({ error: 'Tournament not found' });
      return;
    }

    const tournament = tournamentSnap.data() as {
      name?: string;
      description?: string;
      matchDurationMinutes?: number;
    };
    const tournamentName = tournament.name ?? tournamentId;
    const matchDurationMinutes = tournament.matchDurationMinutes ?? DEFAULT_MATCH_DURATION_MINUTES;
    const matchDurationMs = matchDurationMinutes * 60 * 1000;

    // Fetch teams and build id -> name map
    const teamsSnap = await tournamentRef.collection('teams').get();
    const teamNames = new Map<string, string>();
    for (const teamDoc of teamsSnap.docs) {
      const data = teamDoc.data() as { name?: string };
      teamNames.set(teamDoc.ref.path, data.name ?? teamDoc.id);
    }

    // Resolve the filtered team's full ref path if teamId is provided
    const filteredTeamPath = teamId
      ? tournamentRef.collection('teams').doc(teamId).path
      : null;
    const filteredTeamName = filteredTeamPath ? (teamNames.get(filteredTeamPath) ?? teamId) : null;

    // Collect all games with dates
    interface GameEntry {
      uid: string;
      date: Date;
      summary: string;
      description: string;
    }
    const gameEntries: GameEntry[] = [];

    // Fetch series
    const seriesSnap = await tournamentRef.collection('series').get();
    for (const serieDoc of seriesSnap.docs) {
      const serieName = (serieDoc.data() as { name?: string }).name ?? serieDoc.id;

      // Poules
      const poulesSnap = await serieDoc.ref.collection('poules').get();
      for (const pouleDoc of poulesSnap.docs) {
        const pouleName = (pouleDoc.data() as { name?: string }).name ?? pouleDoc.id;
        const gamesSnap = await pouleDoc.ref.collection('games').get();
        for (const gameDoc of gamesSnap.docs) {
          const game = gameDoc.data() as {
            date?: FirebaseFirestore.Timestamp;
            refTeam1?: FirebaseFirestore.DocumentReference;
            refTeam2?: FirebaseFirestore.DocumentReference;
            isBye?: boolean;
            name?: string;
          };
          if (!game.date || game.isBye) {
            continue;
          }
          if (
            filteredTeamPath &&
            game.refTeam1?.path !== filteredTeamPath &&
            game.refTeam2?.path !== filteredTeamPath
          ) {
            continue;
          }
          const gameDate = game.date.toDate();
          const team1Name = game.refTeam1 ? (teamNames.get(game.refTeam1.path) ?? '?') : '?';
          const team2Name = game.refTeam2 ? (teamNames.get(game.refTeam2.path) ?? '?') : '?';
          const gameName = game.name ?? `${team1Name} - ${team2Name}`;
          gameEntries.push({
            uid: `${tournamentId}-poule-${gameDoc.id}@txapelketak`,
            date: gameDate,
            summary: `${gameName} (${pouleName})`,
            description: `${serieName} — ${pouleName}: ${team1Name} vs ${team2Name}`,
          });
        }
      }

      // Playoffs
      const playoffsSnap = await serieDoc.ref.collection('playoffs').get();
      for (const playoffDoc of playoffsSnap.docs) {
        const playoffName = (playoffDoc.data() as { name?: string }).name ?? playoffDoc.id;
        const gamesSnap = await playoffDoc.ref.collection('games').get();
        for (const gameDoc of gamesSnap.docs) {
          const game = gameDoc.data() as {
            date?: FirebaseFirestore.Timestamp;
            refTeam1?: FirebaseFirestore.DocumentReference;
            refTeam2?: FirebaseFirestore.DocumentReference;
            isBye?: boolean;
            name?: string;
          };
          if (!game.date || game.isBye) {
            continue;
          }
          if (
            filteredTeamPath &&
            game.refTeam1?.path !== filteredTeamPath &&
            game.refTeam2?.path !== filteredTeamPath
          ) {
            continue;
          }
          const gameDate = game.date.toDate();
          const team1Name = game.refTeam1 ? (teamNames.get(game.refTeam1.path) ?? '?') : '?';
          const team2Name = game.refTeam2 ? (teamNames.get(game.refTeam2.path) ?? '?') : '?';
          const gameName = game.name ?? `${team1Name} - ${team2Name}`;
          gameEntries.push({
            uid: `${tournamentId}-playoff-${gameDoc.id}@txapelketak`,
            date: gameDate,
            summary: `${gameName} (${playoffName})`,
            description: `${serieName} — ${playoffName}: ${team1Name} vs ${team2Name}`,
          });
        }
      }

      // Free phases
      const freePhasesSnap = await serieDoc.ref.collection('freePhases').get();
      for (const freePhaseDoc of freePhasesSnap.docs) {
        const freePhaseName = (freePhaseDoc.data() as { name?: string }).name ?? freePhaseDoc.id;
        const gamesSnap = await freePhaseDoc.ref.collection('games').get();
        for (const gameDoc of gamesSnap.docs) {
          const game = gameDoc.data() as {
            date?: FirebaseFirestore.Timestamp;
            refTeam1?: FirebaseFirestore.DocumentReference;
            refTeam2?: FirebaseFirestore.DocumentReference;
            isBye?: boolean;
            name?: string;
          };
          if (!game.date || game.isBye) {
            continue;
          }
          if (
            filteredTeamPath &&
            game.refTeam1?.path !== filteredTeamPath &&
            game.refTeam2?.path !== filteredTeamPath
          ) {
            continue;
          }
          const gameDate = game.date.toDate();
          const team1Name = game.refTeam1 ? (teamNames.get(game.refTeam1.path) ?? '?') : '?';
          const team2Name = game.refTeam2 ? (teamNames.get(game.refTeam2.path) ?? '?') : '?';
          const gameName = game.name ?? `${team1Name} - ${team2Name}`;
          gameEntries.push({
            uid: `${tournamentId}-freephase-${gameDoc.id}@txapelketak`,
            date: gameDate,
            summary: `${gameName} (${freePhaseName})`,
            description: `${serieName} — ${freePhaseName}: ${team1Name} vs ${team2Name}`,
          });
        }
      }
    }

    // Build iCal content
    const calendarName = filteredTeamName
      ? `${tournamentName} - ${filteredTeamName}`
      : tournamentName;
    const now = formatIcalDate(new Date());
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Txapelketak//Calendar Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      foldIcalLine(`X-WR-CALNAME:${escapeIcalText(calendarName)}`),
      'X-WR-TIMEZONE:UTC',
    ];

    for (const entry of gameEntries) {
      const dtStart = formatIcalDate(entry.date);
      const dtEnd = formatIcalDate(new Date(entry.date.getTime() + matchDurationMs));
      lines.push('BEGIN:VEVENT');
      lines.push(foldIcalLine(`UID:${entry.uid}`));
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(foldIcalLine(`SUMMARY:${escapeIcalText(entry.summary)}`));
      lines.push(foldIcalLine(`DESCRIPTION:${escapeIcalText(entry.description)}`));
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const icalContent = lines.join('\r\n') + '\r\n';

    const safeFilename = calendarName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tournament';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.ics"`);
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.status(200).send(icalContent);
  },
);
