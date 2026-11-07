import { DEFAULT_CANCELLATION_POLICY, refundAmountFor, type CancellationPolicy } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { issueRefund } from "../payments/refund";
import { readWaitlist, writeOffers } from "../waitlist/offers";
import { refuse } from "./create-reservation";

export const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

export async function policyFor(id: string | undefined): Promise<CancellationPolicy> {
  const list = (await db.doc("settings/cancellationPolicies").get()).data()?.policies as CancellationPolicy[] | undefined;
  return list?.find((p) => p.id === id) ?? DEFAULT_CANCELLATION_POLICY;
}

export type RefundMode = "policy" | "full" | "none";

/**
 * Cœur de l'annulation, commun au membre et à l'équipe (docs/06 §3). Dans UNE transaction :
 * réservation « cancelled », places libérées, verrou supprimé, places aussitôt proposées à la liste
 * d'attente. Le montant remboursé est calculé ICI : politique de l'expérience (membre), ou au choix
 * de l'équipe (intégral par défaut : décision D6, la plateforme qui annule rembourse tout).
 * Le remboursement passe ensuite par le prestataire ; la réservation devient « refunded » à sa confirmation.
 */
export async function cancelReservationCore(o: {
  reservationId: string;
  by: "user" | "admin";
  actorUid: string;
  refundMode: RefundMode;
  reason: string;
  /** L'équipe peut annuler une expérience déjà commencée (incident sur place). */
  allowStarted?: boolean;
}) {
  const resRef = db.doc(`reservations/${o.reservationId}`);
  const pre = (await resRef.get()).data();
  if (!pre) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  const policy = await policyFor(pre.cancellationPolicyId);

  const result = await db.runTransaction(async (tx) => {
    const res = await tx.get(resRef);
    const r = res.data()!;
    if (r.status !== "confirmed" && r.status !== "pending_payment") refuse("not_cancellable", "Cette réservation ne peut plus être annulée.");
    const sessRef = db.doc(`sessions/${r.sessionId}`);
    const lockRef = sessRef.collection("seatLocks").doc(r.userId);
    const entryRef = sessRef.collection("waitlist").doc(r.userId);
    const [sess, lock, entry] = await Promise.all([tx.get(sessRef), tx.get(lockRef), tx.get(entryRef)]);
    const s = sess.data()!;
    const now = Date.now();
    const startAt = (s.startAt as Timestamp).toDate();
    if (!o.allowStarted && startAt.getTime() <= now) refuse("already_started", "L'expérience a déjà commencé.");
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    const candidates = await readWaitlist(tx, sessRef);

    const paid = r.status === "confirmed" && Boolean(r.paymentId);
    const total = r.pricing.total as number;
    const refundAmount = !paid ? 0 : o.refundMode === "full" ? total : o.refundMode === "none" ? 0 : refundAmountFor(policy, total, startAt, new Date(now));
    tx.update(resRef, {
      status: "cancelled",
      cancellation: {
        at: Timestamp.fromMillis(now),
        by: o.by,
        actorUid: o.actorUid,
        reason: r.status === "pending_payment" && o.by === "user" ? "abandoned" : o.reason,
        refundAmount,
        refundStatus: refundAmount > 0 ? "pending" : "none",
      },
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
    return { refundAmount, paymentId: paid ? (r.paymentId as string) : null, userId: r.userId as string, slug: r.sessionSnapshot?.slug as string | undefined };
  });

  let refundStatus: "none" | "succeeded" | "pending" = "none";
  if (result.refundAmount > 0 && result.paymentId) {
    refundStatus = (await issueRefund(result.paymentId, result.refundAmount, o.by === "user" ? "member_cancellation" : `admin_${o.reason}`)).status;
    if (refundStatus === "succeeded") {
      await resRef.update({ status: "refunded", "cancellation.refundStatus": "succeeded", updatedAt: FieldValue.serverTimestamp() });
    }
  }
  return { refundAmount: result.refundAmount, refundStatus, userId: result.userId };
}

/** Annulation par le membre : politique de l'expérience (100 % jusqu'à 48 h avant, 0 % ensuite). */
export const cancelReservation = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ reservationId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const pre = (await db.doc(`reservations/${parsed.data.reservationId}`).get()).data();
  if (!pre || pre.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  const res = await cancelReservationCore({ reservationId: parsed.data.reservationId, by: "user", actorUid: uid, refundMode: "policy", reason: "member" });
  return { ok: true, refundAmount: res.refundAmount, refundStatus: res.refundStatus };
});
