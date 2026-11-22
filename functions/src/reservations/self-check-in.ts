import { selfCheckInState } from "@thecommunity/shared";
import type { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { idSchema } from "./cancel-reservation";
import { refuse } from "./create-reservation";

/**
 * Arrivée autonome (docs/16, phase 7) : le participant indique lui-même qu'il est arrivé, depuis sa réservation,
 * de 30 min avant le début à 1 h après. La réservation reste « confirmée » (l'avis s'ouvre à la fin, comme avant) ;
 * seule la date d'arrivée est enregistrée. Sans effet si elle l'est déjà.
 */
export async function checkInSelf(uid: string, reservationId: string, now = new Date()): Promise<{ arrivedAt: string }> {
  const ref = db.doc(`reservations/${reservationId}`);
  return db.runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data();
    if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (r.arrivedAt) return { arrivedAt: (r.arrivedAt as Timestamp).toDate().toISOString() };
    if (!["confirmed", "attended"].includes(r.status)) refuse("not_checkable", "Seule une réservation confirmée peut indiquer une arrivée.");
    const state = selfCheckInState((r.sessionSnapshot.startAt as Timestamp).toDate().toISOString(), now);
    if (state === "early") refuse("too_early", "L'arrivée s'indique à partir de 30 minutes avant le début.");
    if (state === "closed") refuse("too_late", "L'expérience a commencé il y a plus d'une heure.");
    tx.update(ref, { arrivedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    // docs/22 § 17.H (H13) : après son check-in, on voit sa table et qui est déjà arrivé.
    if (r.groupId) tx.set(db.doc(`groups/${r.groupId}`), { arrivedUids: FieldValue.arrayUnion(uid) }, { merge: true });
    return { arrivedAt: now.toISOString() };
  });
}

export const selfCheckIn = onCall({ region: REGION, enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ reservationId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  return { ok: true, ...(await checkInSelf(uid, parsed.data.reservationId)) };
});
