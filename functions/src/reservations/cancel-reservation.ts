import { DEFAULT_CANCELLATION_POLICY, refundAmountFor, type CancellationPolicy } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { issueRefund } from "../payments/refund";
import { readWaitlist, writeOffers } from "../waitlist/offers";
import { refuse } from "./create-reservation";

async function policyFor(id: string | undefined): Promise<CancellationPolicy> {
  const list = (await db.doc("settings/cancellationPolicies").get()).data()?.policies as CancellationPolicy[] | undefined;
  return list?.find((p) => p.id === id) ?? DEFAULT_CANCELLATION_POLICY;
}

/**
 * Annulation par le membre (docs/06 §3). Dans UNE transaction : réservation « cancelled », places
 * libérées, verrou supprimé, et places aussitôt proposées à la liste d'attente.
 * Le montant remboursé suit la politique de l'expérience (100 % jusqu'à 48 h avant, 0 % ensuite)
 * et est calculé ICI, au moment de l'annulation. Le remboursement passe par le prestataire ;
 * la réservation devient « refunded » à sa confirmation.
 * Une réservation en attente de paiement peut aussi être abandonnée (rien à rembourser).
 */
export const cancelReservation = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ reservationId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const resRef = db.doc(`reservations/${parsed.data.reservationId}`);
  const pre = (await resRef.get()).data();
  if (!pre || pre.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  const policy = await policyFor(pre.cancellationPolicyId);

  const result = await db.runTransaction(async (tx) => {
    const res = await tx.get(resRef);
    const r = res.data()!;
    if (r.status !== "confirmed" && r.status !== "pending_payment") refuse("not_cancellable", "Cette réservation ne peut plus être annulée.");
    const sessRef = db.doc(`sessions/${r.sessionId}`);
    const lockRef = sessRef.collection("seatLocks").doc(uid);
    const entryRef = sessRef.collection("waitlist").doc(uid);
    const [sess, lock, entry] = await Promise.all([tx.get(sessRef), tx.get(lockRef), tx.get(entryRef)]);
    const s = sess.data()!;
    const now = Date.now();
    const startAt = (s.startAt as Timestamp).toDate();
    if (startAt.getTime() <= now) refuse("already_started", "L'expérience a déjà commencé.");
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    const candidates = await readWaitlist(tx, sessRef);

    const paid = r.status === "confirmed" && Boolean(r.paymentId);
    const refundAmount = paid ? refundAmountFor(policy, r.pricing.total, startAt, new Date(now)) : 0;
    tx.update(resRef, {
      status: "cancelled",
      cancellation: { at: Timestamp.fromMillis(now), by: "user", reason: r.status === "pending_payment" ? "abandoned" : "member", refundAmount, refundStatus: refundAmount > 0 ? "pending" : "none" },
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (lock.data()?.reservationId === res.id) tx.delete(lockRef);
    if (entry.exists && entry.data()?.reservationId === res.id) tx.update(entryRef, { status: "left", updatedAt: FieldValue.serverTimestamp() });

    const n = r.seats as number;
    const wasHeld = r.status === "pending_payment";
    const available = s.capacity - (s.seatsConfirmed - (wasHeld ? 0 : n)) - (s.seatsHeld - (wasHeld ? n : 0));
    const offers = exp.exists ? writeOffers(tx, { sessRef, s, e: exp.data()!, candidates, available, now }) : { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0 };
    const left = available - offers.heldDelta - offers.confirmedDelta;
    tx.update(sessRef, {
      seatsConfirmed: FieldValue.increment((wasHeld ? 0 : -n) + offers.confirmedDelta),
      seatsHeld: FieldValue.increment((wasHeld ? -n : 0) + offers.heldDelta),
      waitlistCount: FieldValue.increment(offers.waitingDelta),
      ...(["published", "full"].includes(s.status) ? { status: left > 0 ? "published" : "full" } : {}),
      // Tables déjà composées : l'équipe devra les revoir (phase 6).
      ...(["validated", "revealed"].includes(s.groupsStatus) ? { groupsNeedReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { refundAmount, paymentId: paid ? (r.paymentId as string) : null };
  });

  let refundStatus: "none" | "succeeded" | "pending" = "none";
  if (result.refundAmount > 0 && result.paymentId) {
    refundStatus = (await issueRefund(result.paymentId, result.refundAmount, "member_cancellation")).status;
    if (refundStatus === "succeeded") {
      await resRef.update({ status: "refunded", "cancellation.refundStatus": "succeeded", updatedAt: FieldValue.serverTimestamp() });
    }
  }
  return { ok: true, refundAmount: result.refundAmount, refundStatus };
});
