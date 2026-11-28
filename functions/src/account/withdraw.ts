import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { cancelReservationCore } from "../reservations/cancel-reservation";
import { notifyCancelledByTeam } from "../notify/cancellations";

/**
 * Audit du 23/11 : retire une personne de tout ce qui est à venir (suspension du compte) :
 * réservations confirmées ou en attente de paiement (annulées, remboursées intégralement sauf `refund: "none"`,
 * retirées de leur table et du chat), listes d'attente quittées, demandes de participation closes.
 */
export async function withdrawFromUpcoming(uid: string, o: { actorUid: string; refund: "full" | "none"; reason: string }) {
  const now = Date.now();
  const [reservations, waiting, requests] = await Promise.all([
    db.collection("reservations").where("userId", "==", uid).where("status", "in", ["confirmed", "pending_payment"]).get(),
    db.collectionGroup("waitlist").where("userId", "==", uid).get(),
    db.collection("bookingRequests").where("userId", "==", uid).where("status", "==", "pending").get(),
  ]);
  let cancelled = 0;
  let refunded = 0;
  const failures: string[] = [];
  for (const d of reservations.docs) {
    const start = d.get("sessionSnapshot.startAt")?.toMillis?.() ?? 0;
    if (start <= now) continue; // le passé ne change pas
    try {
      const res = await cancelReservationCore({ reservationId: d.id, by: "admin", actorUid: o.actorUid, refundMode: o.refund, reason: o.reason, allowStarted: true });
      cancelled++;
      refunded += res.refundAmount;
      await notifyCancelledByTeam(d.id, res.refundAmount).catch((e) => logger.error("Notification d'annulation", e));
    } catch (e) {
      failures.push(d.id);
      logger.error("Annulation à la suspension", { reservationId: d.id, e });
    }
  }
  for (const w of waiting.docs.filter((x) => ["waiting", "offered"].includes(String(x.get("status"))))) {
    // Une place déjà proposée est une réservation en attente de paiement : annulée ci-dessus.
    await db.runTransaction(async (tx) => {
      const cur = await tx.get(w.ref);
      if (cur.get("status") !== "waiting") {
        if (cur.get("status") === "offered") tx.update(w.ref, { status: "left", updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      tx.update(w.ref, { status: "left", updatedAt: FieldValue.serverTimestamp() });
      tx.update(w.ref.parent.parent!, { waitlistCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
    });
  }
  if (!requests.empty) {
    const batch = db.batch();
    requests.docs.forEach((q) => batch.update(q.ref, { status: "cancelled", cancelledReason: o.reason, updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();
  }
  return { cancelled, refunded, failures };
}
