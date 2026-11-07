import { Timestamp, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { providerFor } from "./provider";

/** Notification de paiement, déjà authentifiée (signature du prestataire, ou callable de test). */
export type PaymentEvent = {
  id: string; // identifiant unique côté prestataire : garantit l'idempotence
  provider: string;
  paymentId: string;
  status: "succeeded" | "failed";
  amount: number;
  currency: string;
  providerRef?: string;
  failureReason?: string;
};

export type ApplyOutcome = "confirmed" | "failed" | "duplicate" | "ignored" | "refunded";

/** Lieu communiqué dès la confirmation, sauf pour les expériences où il est révélé avec le groupe. */
function venueFor(exp: DocumentSnapshot) {
  const v = exp.data()?.venue;
  return v && v.revealPolicy === "immediate" ? { name: v.name ?? "", address: v.address ?? "" } : null;
}

function confirmFields(exp: DocumentSnapshot, paymentId: string) {
  const venue = venueFor(exp);
  return {
    status: "confirmed",
    paidAt: FieldValue.serverTimestamp(),
    paymentId,
    ...(venue ? { venue } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Applique une notification de paiement (docs/06 §2), dans UNE transaction :
 * - idempotence : un même événement n'est traité qu'une fois (paymentEvents) ;
 * - montant vérifié contre celui calculé par le serveur ;
 * - paiement dans les temps : les places bloquées deviennent confirmées ;
 * - paiement tardif (blocage expiré) : on reprend une place s'il en reste, sinon remboursement automatique.
 * Aucun cas où quelqu'un paie sans avoir ni place ni remboursement.
 */
export async function applyPaymentEvent(ev: PaymentEvent): Promise<{ outcome: ApplyOutcome; reservationId?: string }> {
  type Decision = { outcome: ApplyOutcome; reservationId?: string; refund?: { amount: number; reason: string } };
  const decision = await db.runTransaction<Decision>(async (tx: Transaction) => {
    const evRef = db.doc(`paymentEvents/${ev.provider}_${ev.id}`);
    const payRef = db.doc(`payments/${ev.paymentId}`);
    const [evSnap, pay] = await Promise.all([tx.get(evRef), tx.get(payRef)]);
    if (evSnap.exists) return { outcome: "duplicate" };
    if (!pay.exists) throw new Error(`Paiement inconnu : ${ev.paymentId}`);
    const p = pay.data()!;
    const resRef = db.doc(`reservations/${p.reservationId}`);
    const res = await tx.get(resRef);
    const r = res.data()!;
    const sessRef = db.doc(`sessions/${r.sessionId}`);
    const lockRef = sessRef.collection("seatLocks").doc(r.userId);
    const [sess, lock, exp] = await Promise.all([tx.get(sessRef), tx.get(lockRef), tx.get(db.doc(`experiences/${r.experienceId}`))]);

    const logged = Object.fromEntries(Object.entries(ev).filter(([, v]) => v !== undefined));
    tx.set(evRef, { ...logged, receivedAt: FieldValue.serverTimestamp() });
    const base = { processedEventIds: FieldValue.arrayUnion(ev.id), updatedAt: FieldValue.serverTimestamp() };

    if (p.status !== "initiated") {
      // Paiement déjà conclu (ex. refus puis succès sur la même tentative) : on ne fait rien de plus,
      // mais un encaissement inattendu est signalé dans les journaux pour vérification.
      if (ev.status === "succeeded" && p.status !== "succeeded") logger.error("Encaissement sur un paiement déjà clos", { ev, status: p.status });
      tx.update(payRef, base);
      return { outcome: "ignored", reservationId: res.id };
    }
    if (ev.status === "failed") {
      tx.update(payRef, { ...base, status: "failed", failureReason: ev.failureReason ?? "declined" });
      return { outcome: "failed", reservationId: res.id };
    }

    tx.update(payRef, { ...base, status: "succeeded", providerRef: ev.providerRef ?? p.providerRef ?? null, paidAmount: ev.amount });
    if (ev.amount !== p.amount || ev.currency !== p.currency) {
      return { outcome: "refunded", reservationId: res.id, refund: { amount: ev.amount, reason: "amount_mismatch" } };
    }

    const n = r.seats as number;
    if (r.status === "pending_payment") {
      // Les places sont encore bloquées pour cette réservation : elles deviennent confirmées.
      tx.update(sessRef, { seatsHeld: FieldValue.increment(-n), seatsConfirmed: FieldValue.increment(n), updatedAt: FieldValue.serverTimestamp() });
      tx.update(resRef, confirmFields(exp, pay.id));
      return { outcome: "confirmed", reservationId: res.id };
    }

    if (r.status === "expired") {
      const s = sess.data()!;
      const available = s.capacity - s.seatsConfirmed - s.seatsHeld;
      const lockFree = !lock.exists || lock.data()?.reservationId === res.id;
      const notStarted = (s.startAt as Timestamp).toMillis() > Date.now();
      if (["published", "full"].includes(s.status) && notStarted && lockFree && available >= n) {
        tx.update(sessRef, {
          seatsConfirmed: FieldValue.increment(n),
          ...(available - n === 0 ? { status: "full" } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(lockRef, { reservationId: res.id, createdAt: FieldValue.serverTimestamp() });
        tx.update(resRef, { ...confirmFields(exp, pay.id), latePayment: true });
        return { outcome: "confirmed", reservationId: res.id };
      }
    }
    // Plus de place (ou réservation annulée entre-temps) : remboursement intégral.
    return { outcome: "refunded", reservationId: res.id, refund: { amount: ev.amount, reason: "late_payment_no_seat" } };
  });

  if (decision.refund) await refundPayment(ev.paymentId, decision.refund.amount, decision.refund.reason);
  return { outcome: decision.outcome, reservationId: decision.reservationId };
}

/** Rembourse un paiement réussi et clôt la réservation correspondante si elle n'a pas de place. */
export async function refundPayment(paymentId: string, amount: number, reason: string) {
  const payRef = db.doc(`payments/${paymentId}`);
  const p = (await payRef.get()).data()!;
  const provider = providerFor(p.provider);
  const result = await provider.refund({ paymentId, providerRef: p.providerRef ?? undefined, amount, currency: p.currency });
  const refundRef = db.collection("payments").doc();
  const batch = db.batch();
  batch.set(refundRef, {
    type: "refund",
    parentPaymentId: paymentId,
    reservationId: p.reservationId,
    userId: p.userId,
    provider: p.provider,
    mode: p.mode ?? null,
    providerRef: result.providerRef ?? null,
    amount,
    currency: p.currency,
    reason,
    status: result.status === "succeeded" ? "succeeded" : "initiated",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (result.status === "succeeded") {
    batch.update(payRef, { status: amount >= p.amount ? "refunded" : "partially_refunded", updatedAt: FieldValue.serverTimestamp() });
  }
  const resRef = db.doc(`reservations/${p.reservationId}`);
  const r = (await resRef.get()).data();
  // Seule une réservation expirée (paiement tardif sans place) est close ici. Une réservation confirmée par un
  // autre paiement (doublon) ou encore en attente (montant erroné : la personne peut repayer) n'est pas touchée.
  if (r && r.status === "expired") {
    batch.update(resRef, {
      status: result.status === "succeeded" ? "refunded" : r.status,
      cancellation: { at: Timestamp.now(), by: "system", reason, refundAmount: amount },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  logger.warn("Remboursement automatique", { paymentId, amount, reason });
}
