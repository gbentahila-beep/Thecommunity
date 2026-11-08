import { Timestamp, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { nextMembershipPeriod } from "@thecommunity/shared";
import { db, FieldValue } from "../lib/admin";
import { afterPaymentSettled } from "../invoices/issue";
import { issueRefund } from "./refund";
import { redeemPromo } from "../reservations/create-reservation";

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
export async function applyPaymentEvent(ev: PaymentEvent): Promise<{ outcome: ApplyOutcome; reservationId?: string; purpose?: "reservation" | "membership" }> {
  type Decision = { outcome: ApplyOutcome; reservationId?: string; purpose?: "reservation" | "membership"; refund?: { amount: number; reason: string } };
  const decision = await db.runTransaction<Decision>(async (tx: Transaction) => {
    const evRef = db.doc(`paymentEvents/${ev.provider}_${ev.id}`);
    const payRef = db.doc(`payments/${ev.paymentId}`);
    const [evSnap, pay] = await Promise.all([tx.get(evRef), tx.get(payRef)]);
    if (evSnap.exists) return { outcome: "duplicate" };
    if (!pay.exists) throw new Error(`Paiement inconnu : ${ev.paymentId}`);
    const p = pay.data()!;
    if (p.purpose === "membership") return applyMembershipPayment(tx, ev, evRef, payRef, p);
    const resRef = db.doc(`reservations/${p.reservationId}`);
    const res = await tx.get(resRef);
    const r = res.data()!;
    const sessRef = db.doc(`sessions/${r.sessionId}`);
    const lockRef = sessRef.collection("seatLocks").doc(r.userId);
    const promoCode = r.pricing?.promoCode as string | undefined;
    const [sess, lock, exp, redemption] = await Promise.all([
      tx.get(sessRef),
      tx.get(lockRef),
      tx.get(db.doc(`experiences/${r.experienceId}`)),
      promoCode ? tx.get(db.doc(`promoCodes/${promoCode}/redemptions/${r.userId}`)) : Promise.resolve(null),
    ]);
    // Code promo : compté une seule fois par personne, au moment où la place est confirmée.
    const countPromo = () => {
      if (promoCode && !redemption?.exists) redeemPromo(tx, promoCode, r.userId, res.id);
    };

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
      tx.update(sessRef, {
        seatsHeld: FieldValue.increment(-n),
        seatsConfirmed: FieldValue.increment(n),
        // Tables déjà composées : la nouvelle personne est à placer.
        ...(["validated", "revealed"].includes(sess.data()?.groupsStatus) ? { groupsNeedReview: true } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(resRef, confirmFields(exp, pay.id));
      countPromo();
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
          ...(["validated", "revealed"].includes(s.groupsStatus) ? { groupsNeedReview: true } : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.set(lockRef, { reservationId: res.id, createdAt: FieldValue.serverTimestamp() });
        tx.update(resRef, { ...confirmFields(exp, pay.id), latePayment: true });
        countPromo();
        return { outcome: "confirmed", reservationId: res.id };
      }
    }
    // Plus de place (ou réservation annulée entre-temps) : remboursement intégral.
    return { outcome: "refunded", reservationId: res.id, refund: { amount: ev.amount, reason: "late_payment_no_seat" } };
  });

  // Facture + e-mail de confirmation (5c). En cas de remboursement automatique, la facture est émise avec l'avoir.
  if (decision.outcome === "confirmed") await afterPaymentSettled({ paymentId: ev.paymentId });
  if (decision.refund) await refundPayment(ev.paymentId, decision.refund.amount, decision.refund.reason);
  return { outcome: decision.outcome, reservationId: decision.reservationId, purpose: decision.purpose ?? "reservation" };
}

/**
 * Paiement d'un abonnement annuel : à la réussite (montant vérifié), l'abonnement est activé ou prolongé
 * de 12 mois (à partir de l'échéance en cours si l'on renouvelle en avance), dans la même transaction.
 */
async function applyMembershipPayment(
  tx: Transaction,
  ev: PaymentEvent,
  evRef: FirebaseFirestore.DocumentReference,
  payRef: FirebaseFirestore.DocumentReference,
  p: FirebaseFirestore.DocumentData,
): Promise<{ outcome: ApplyOutcome; purpose: "membership"; refund?: { amount: number; reason: string } }> {
  const memRef = db.doc(`memberships/${p.userId}`);
  const mem = await tx.get(memRef);
  const logged = Object.fromEntries(Object.entries(ev).filter(([, v]) => v !== undefined));
  tx.set(evRef, { ...logged, receivedAt: FieldValue.serverTimestamp() });
  const base = { processedEventIds: FieldValue.arrayUnion(ev.id), updatedAt: FieldValue.serverTimestamp() };
  if (p.status !== "initiated") {
    tx.update(payRef, base);
    return { outcome: "ignored", purpose: "membership" };
  }
  if (ev.status === "failed") {
    tx.update(payRef, { ...base, status: "failed", failureReason: ev.failureReason ?? "declined" });
    return { outcome: "failed", purpose: "membership" };
  }
  tx.update(payRef, { ...base, status: "succeeded", providerRef: ev.providerRef ?? p.providerRef ?? null, paidAmount: ev.amount });
  if (ev.amount !== p.amount || ev.currency !== p.currency) {
    return { outcome: "refunded", purpose: "membership", refund: { amount: ev.amount, reason: "amount_mismatch" } };
  }
  const current = mem.data();
  const period = nextMembershipPeriod(current ? { status: current.status, endAt: (current.endAt as Timestamp).toDate() } : null);
  tx.set(memRef, {
    uid: p.userId,
    planId: p.planId,
    status: "active",
    source: "purchase",
    startAt: current && current.status === "active" && (current.endAt as Timestamp).toMillis() > Date.now() ? current.startAt : Timestamp.fromDate(period.startAt),
    endAt: Timestamp.fromDate(period.endAt),
    lastPaymentId: payRef.id,
    ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  tx.set(memRef.collection("periods").doc(payRef.id), {
    startAt: Timestamp.fromDate(period.startAt),
    endAt: Timestamp.fromDate(period.endAt),
    paymentId: payRef.id,
    amount: p.amount,
    source: "purchase",
    createdAt: FieldValue.serverTimestamp(),
  });
  tx.set(db.collection(`users/${p.userId}/notifications`).doc(), {
    type: "membership_active",
    title: { fr: "Bienvenue parmi les membres !", ar: "مرحبًا بك بين الأعضاء!" },
    body: { fr: "Votre abonnement est actif : vos prix membres s'appliquent dès maintenant.", ar: "اشتراكك مفعّل: أسعار الأعضاء تُطبَّق من الآن." },
    link: "/abonnement",
    createdAt: FieldValue.serverTimestamp(),
  });
  return { outcome: "confirmed", purpose: "membership" };
}

/** Rembourse un paiement réussi et clôt la réservation correspondante si elle n'a pas de place. */
export async function refundPayment(paymentId: string, amount: number, reason: string) {
  const p = (await db.doc(`payments/${paymentId}`).get()).data()!;
  const result = await issueRefund(paymentId, amount, reason);
  if (p.purpose === "membership") {
    logger.warn("Remboursement automatique (abonnement)", { paymentId, amount, reason });
    return;
  }
  const resRef = db.doc(`reservations/${p.reservationId}`);
  const r = (await resRef.get()).data();
  // Seule une réservation expirée (paiement tardif sans place) est close ici. Une réservation confirmée par un
  // autre paiement (doublon) ou encore en attente (montant erroné : la personne peut repayer) n'est pas touchée.
  if (r && r.status === "expired") {
    await resRef.update({
      status: result.status === "succeeded" ? "refunded" : r.status,
      cancellation: { at: Timestamp.now(), by: "system", reason, refundAmount: amount },
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  logger.warn("Remboursement automatique", { paymentId, amount, reason });
}
