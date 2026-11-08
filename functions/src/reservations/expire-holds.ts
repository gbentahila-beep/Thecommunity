import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";
import { sendTransferExpired } from "../payments/transfer-mail";
import { readWaitlist, writeOffers } from "../waitlist/offers";

/**
 * Libère une réservation dont le blocage de 15 minutes est dépassé sans paiement :
 * statut « expired », places rendues (seatsHeld −= n), verrou supprimé ; les places sont aussitôt proposées
 * à la liste d'attente (dans la même transaction), sinon la date est rouverte si elle était complète.
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
    const entryRef = sessRef.collection("waitlist").doc(r.userId);
    const [sess, lock, entry] = await Promise.all([tx.get(sessRef), tx.get(lockRef), r.fromWaitlist ? tx.get(entryRef) : Promise.resolve(null)]);
    const s = sess.data()!;
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    const candidates = await readWaitlist(tx, sessRef);

    tx.update(resRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
    if (entry?.exists && entry.data()?.reservationId === reservationId) {
      tx.update(entryRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
    }
    if (lock.data()?.reservationId === reservationId) tx.delete(lockRef);
    const available = s.capacity - s.seatsConfirmed - (s.seatsHeld - r.seats);
    const offers = exp.exists ? writeOffers(tx, { sessRef, s, e: exp.data()!, candidates, available, now }) : { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0 };
    const left = available - offers.heldDelta - offers.confirmedDelta;
    tx.update(sessRef, {
      seatsHeld: FieldValue.increment(-r.seats + offers.heldDelta),
      seatsConfirmed: FieldValue.increment(offers.confirmedDelta),
      waitlistCount: FieldValue.increment(offers.waitingDelta),
      ...(["published", "full"].includes(s.status) ? { status: left > 0 ? "published" : "full" } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
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
  for (const d of due.docs) {
    if (!(await expireReservation(d.id, now))) continue;
    count++;
    // Virement non reçu à l'échéance : la personne est prévenue (5h).
    if (d.data().paymentMethod === "bank_transfer") await sendTransferExpired(d.id);
  }
  return count;
}

/** Toutes les 5 minutes (docs/06 §1). La liste d'attente sera prévenue ici à l'étape 4b. */
export const expireHolds = onSchedule({ schedule: "every 5 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const n = await expireDueHolds();
  if (n > 0) logger.info(`${n} réservation(s) expirée(s), places libérées.`);
});
