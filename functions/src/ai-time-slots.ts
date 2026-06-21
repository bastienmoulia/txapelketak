import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

if (getApps().length === 0) {
  initializeApp();
}

const FIREBASE_CLIENT_CONFIG = {
  apiKey: 'AIzaSyAml_FZRsRZjrClzGdbqyWkWTEQ3SKmTlA',
  projectId: 'txapelketak-ac529',
  appId: '1:210687482712:web:22ae72552902c05891e32d',
};
const AI_CLIENT_APP_NAME = 'ai-logic-client';

function getAiModel() {
  const existing = getClientApps().find((a) => a.name === AI_CLIENT_APP_NAME);
  const clientApp = existing ?? initClientApp(FIREBASE_CLIENT_CONFIG, AI_CLIENT_APP_NAME);
  const ai = getAI(clientApp, { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, { model: 'gemini-3.1-flash-lite' });
}

interface AiTimeSlotsData {
  tournamentId: string;
  token: string;
  prompt: string;
  currentTimeSlots: string[];
  databaseId?: string;
  userTimezone?: string;
}

export const aiTimeSlots = onCall({ region: 'europe-west1' }, async (request) => {
  const { tournamentId, token, prompt, currentTimeSlots, databaseId, userTimezone } =
    request.data as AiTimeSlotsData;

  if (!tournamentId || typeof tournamentId !== 'string') {
    throw new HttpsError('invalid-argument', 'tournamentId is required and must be a string');
  }
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'token is required and must be a string');
  }
  if (!prompt || typeof prompt !== 'string') {
    throw new HttpsError('invalid-argument', 'prompt is required and must be a string');
  }
  if (
    !Array.isArray(currentTimeSlots) ||
    !currentTimeSlots.every((d) => typeof d === 'string' && !isNaN(Date.parse(d)))
  ) {
    throw new HttpsError(
      'invalid-argument',
      'currentTimeSlots must be an array of ISO 8601 date strings',
    );
  }

  const db = databaseId ? getFirestore(databaseId) : getFirestore();

  const tournamentRef = db.collection('tournaments').doc(tournamentId);
  const tournamentSnap = await tournamentRef.get();
  if (!tournamentSnap.exists) {
    throw new HttpsError('not-found', 'Tournament not found');
  }

  // Verify admin token
  const usersSnapshot = await db
    .collection('users')
    .where('refTournament', '==', tournamentRef)
    .where('token', '==', token)
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action');
  }

  const model = getAiModel();

  const currentSlotsText =
    currentTimeSlots.length > 0 ? currentTimeSlots.map((d) => `  - ${d}`).join('\n') : '  (none)';

  const now = new Date();
  const timezone = userTimezone ?? 'UTC';
  const localDateStr = now.toLocaleDateString('en-CA', { timeZone: timezone }); // YYYY-MM-DD
  const localTimeStr = now.toLocaleTimeString('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
  });

  const systemPrompt = `You are a time slot management assistant for a tournament application.
Your task is to modify a list of time slots based on a user request.
Time slots represent scheduled game times for a tournament.

Current date and time: ${localDateStr} ${localTimeStr} (timezone: ${timezone})

Current time slots (ISO 8601 UTC format):
${currentSlotsText}

User request: "${prompt}"

Instructions:
- Return ONLY a valid JSON array of ISO 8601 date strings (e.g. "2024-06-21T07:00:00.000Z")
- The array must represent the COMPLETE new list of time slots after applying the requested changes
- Preserve existing time slots that should not be modified
- Add new time slots as requested
- Remove time slots as requested
- Round minutes to the nearest 5-minute interval
- Set seconds and milliseconds to 0
- All times given by the user are in the timezone: ${timezone}. Convert them to UTC for the output.
- Do not include any explanation, just the JSON array
- If no changes are needed, return the current list unchanged`;

  const result = await model.generateContent(systemPrompt);
  const responseText = result.response.text().trim();

  // Extract JSON array from response (handle potential markdown code blocks)
  let jsonText = responseText;
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim();
  }

  let proposedTimeSlots: string[];
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    const normalized = parsed.map((item) => {
      if (typeof item !== 'string') {
        throw new Error('Response contains a non-string item');
      }
      const date = new Date(item);
      if (isNaN(date.getTime())) {
        throw new Error('Response contains an invalid date');
      }
      // Normalize to 5-minute grid, with seconds/millis set to 0 (UTC)
      const minutes = date.getUTCMinutes();
      const roundedMinutes = Math.round(minutes / 5) * 5;
      date.setUTCMinutes(roundedMinutes, 0, 0);
      return date.toISOString();
    });

    proposedTimeSlots = Array.from(new Set(normalized)).sort(
      (a, b) => Date.parse(a) - Date.parse(b),
    );
  } catch {
    throw new HttpsError('internal', 'Failed to parse AI response as a list of dates');
  }

  return { proposedTimeSlots };
});
