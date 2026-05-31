import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (getApps().length === 0) {
  initializeApp();
}

interface DeleteTournamentData {
  tournamentId: string;
  token: string;
  databaseId?: string;
}

const BATCH_SIZE = 450;

async function deleteDocsInBatches(
  db: FirebaseFirestore.Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): Promise<void> {
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function deleteCollection(
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  collectionName: string,
): Promise<void> {
  const snapshot = await ref.collection(collectionName).get();
  if (snapshot.docs.length === 0) {
    return;
  }
  await deleteDocsInBatches(db, snapshot.docs);
}

export const deleteTournament = onCall<DeleteTournamentData>(
  { region: 'europe-west1' },
  async (request) => {
    const { tournamentId, token, databaseId } = request.data;

    // Validate input
    if (!tournamentId || typeof tournamentId !== 'string') {
      throw new HttpsError('invalid-argument', 'tournamentId is required and must be a string');
    }
    if (!token || typeof token !== 'string') {
      throw new HttpsError('invalid-argument', 'token is required and must be a string');
    }

    // Get the correct Firestore database instance
    const db = databaseId ? getFirestore(databaseId) : getFirestore();

    // Get tournament document
    const tournamentRef = db.collection('tournaments').doc(tournamentId);
    const tournamentSnap = await tournamentRef.get();

    if (!tournamentSnap.exists) {
      throw new HttpsError('not-found', 'Tournament not found');
    }

    // Verify that the token belongs to an admin user for this tournament
    const usersSnapshot = await db
      .collection('users')
      .where('refTournament', '==', tournamentRef)
      .where('token', '==', token)
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      throw new HttpsError(
        'permission-denied',
        'You do not have permission to delete this tournament',
      );
    }

    // Cascading deletion

    // 1. Delete all users associated with this tournament
    const allUsersSnapshot = await db
      .collection('users')
      .where('refTournament', '==', tournamentRef)
      .get();

    if (allUsersSnapshot.docs.length > 0) {
      await deleteDocsInBatches(db, allUsersSnapshot.docs);
    }

    // 2. Delete all teams
    await deleteCollection(db, tournamentRef, 'teams');

    // 3. Delete all series with nested poules/playoffs and their games
    const seriesSnapshot = await tournamentRef.collection('series').get();
    for (const serieDoc of seriesSnapshot.docs) {
      // Delete poules and their games
      const poulesSnapshot = await serieDoc.ref.collection('poules').get();
      for (const pouleDoc of poulesSnapshot.docs) {
        await deleteCollection(db, pouleDoc.ref, 'games');
        await pouleDoc.ref.delete();
      }

      // Delete playoffs and their games
      const playoffsSnapshot = await serieDoc.ref.collection('playoffs').get();
      for (const playoffDoc of playoffsSnapshot.docs) {
        await deleteCollection(db, playoffDoc.ref, 'games');
        await playoffDoc.ref.delete();
      }

      await serieDoc.ref.delete();
    }

    // 4. Delete all time slots
    await deleteCollection(db, tournamentRef, 'timeSlots');

    // 5. Delete the tournament document itself
    await tournamentRef.delete();

    return { success: true };
  },
);
