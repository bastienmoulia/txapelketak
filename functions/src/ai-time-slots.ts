import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (getApps().length === 0) {
  initializeApp();
}

const geminiApiKey = defineSecret('GEMINI_API_KEY');

interface AiTimeSlotsData {
  tournamentId: string;
  token: string;
  prompt: string;
  currentTimeSlots: string[];
  databaseId?: string;
}

export const aiTimeSlots = onCall(
  { region: 'europe-west1', secrets: [geminiApiKey] },
  async (request) => {
    const { tournamentId, token, prompt, currentTimeSlots, databaseId } =
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
    if (!Array.isArray(currentTimeSlots)) {
      throw new HttpsError('invalid-argument', 'currentTimeSlots must be an array');
    }

    const db = databaseId ? getFirestore(databaseId) : getFirestore();

    const tournamentRef = db.collection('tournaments').doc(tournamentId);

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

    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'Gemini API key is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const currentSlotsText =
      currentTimeSlots.length > 0
        ? currentTimeSlots.map((d) => `  - ${d}`).join('\n')
        : '  (none)';

    const systemPrompt = `You are a time slot management assistant for a tournament application.
Your task is to modify a list of time slots based on a user request.
Time slots represent scheduled game times for a tournament.

Current time slots (ISO 8601 UTC format):
${currentSlotsText}

User request: "${prompt}"

Instructions:
- Return ONLY a valid JSON array of ISO 8601 date strings (e.g. "2024-06-21T09:00:00.000Z")
- The array must represent the COMPLETE new list of time slots after applying the requested changes
- Preserve existing time slots that should not be modified
- Add new time slots as requested
- Remove time slots as requested
- Round minutes to the nearest 5-minute interval
- Set seconds and milliseconds to 0
- If the user does not specify a timezone, use UTC
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
  },
);
