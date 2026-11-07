import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";

/**
 * Libère une réservation dont le blocage de 15 minutes est dépassé sans paiement :
 * statut « expired », places rendues (seatsHeld −= n), verrou supprimé, date rouverte si elle était complète.
 * Sans effet si la réservation a été payée ou modifiée entre-temps (relecture dans la transaction).
 */
export async function expireReservation(reservationId: string, now = Date.now()): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const resRef = db.doc(`reservations/${reservationId}`);
    const res = await tx.get(resRef);
    const r = res.data();
    if (!r || r.status !== "pending_payment" || (r.holdExpiresAt as Timestamp).toMillis() > now) return false;
    const sessRef = db.doc(`sessions/${r.sessionId}`);
    const lockRef = sessRef.collection("seatLocks").doc(r.userId);
    const [sess, lock] = await Promise.all([tx.get(sessRef), tx.get(lockRef)]);
    const s = sess.data()!;
    const available = s.capacity - s.seatsConfirmed - (s.seatsHeld - r.seats);
    tx.update(resRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
    tx.update(sessRef, {
      seatsHeld: FieldValue.increment(-r.seats),
      ...(s.status === "full" && available > 0 ? { status: "published" } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (lock.data()?.reservationId === reservationId) tx.delete(lockRef);
    return true;
  });
}

/** Expire toutes les réservations en attente dont le blocage est dépassé. */
export async function expireDueHolds(now = Date.now()): Promise<number> {
  const due = await db
    .collection("reservations")
    .where("status", "==", "pending_payment")
    .where("holdExpiresAt", "<=", Timestamp.fromMillis(now))
    .limit(300)
    .get();
  let count = 0;
  for (const d of due.docs) if (await expireReservation(d.id, now)) count++;
  return count;
}

/** Toutes les 5 minutes (docs/06 §1). La liste d'attente sera prévenue ici à l'étape 4b. */
export const expireHolds = onSchedule({ schedule: "every 5 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const n = await expireDueHolds();
  if (n > 0) logger.info(`${n} réservation(s) expirée(s), places libérées.`);
});
