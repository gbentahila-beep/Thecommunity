import { FieldPath, Timestamp, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";

/** Politique de confidentialité : régime, allergies et langues de table effacés 30 jours après l'expérience. */
export const PREFERENCES_RETENTION_DAYS = 30;

/**
 * Étape A — efface `preferences` (régime, allergies : donnée de santé, loi 09-08) des réservations et des demandes
 * de participation dont l'expérience a eu lieu il y a plus de 30 jours. Seuls les documents qui ont encore ces
 * informations sont lus (filtre `preferences != null`), donc le travail reste léger. Renvoie le nombre effacé.
 */
export async function purgeExpiredPreferences(now = Date.now()): Promise<number> {
  const cutoff = now - PREFERENCES_RETENTION_DAYS * 86_400_000;
  let purged = 0;
  for (const coll of ["reservations", "bookingRequests"]) {
    let last: QueryDocumentSnapshot | null = null;
    for (let page = 0; page < 20; page++) {
      let q = db.collection(coll).where("preferences", "!=", null).orderBy("preferences").orderBy(FieldPath.documentId()).limit(300);
      if (last) q = q.startAfter(last.get("preferences"), last.id);
      const snap = await q.get();
      if (snap.empty) break;
      const batch = db.batch();
      let n = 0;
      for (const d of snap.docs) {
        const start = d.get("sessionSnapshot.startAt");
        if (start instanceof Timestamp && start.toMillis() <= cutoff) {
          batch.update(d.ref, { preferences: FieldValue.delete(), preferencesPurgedAt: FieldValue.serverTimestamp() });
          n++;
        }
      }
      if (n) await batch.commit();
      purged += n;
      last = snap.docs.at(-1)!;
      if (snap.size < 300) break;
    }
  }
  return purged;
}

/** Chaque nuit à 3 h 30 (heure de Casablanca). */
export const purgePreferences = onSchedule({ schedule: "30 3 * * *", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const n = await purgeExpiredPreferences();
  if (n > 0) logger.info(`${n} fiche(s) régime / allergies effacée(s) (30 jours après l'expérience).`);
});
