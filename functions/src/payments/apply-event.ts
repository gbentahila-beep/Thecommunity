import { Timestamp, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { addPassAndCredits } from "../membership/membership";
import { db, FieldValue } from "../lib/admin";
import { commissionRules, commissionSnapshot, writeSaleEntry } from "../commissions/ledger";
import { afterPaymentSettled } from "../invoices/issue";
import { issueRefund } from "./refund";
import { redeemPromo } from "../reservations/create-reservation";
import { notifyQuestionnaire } from "../reservations/questionnaire";

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
  // Audit 23/11 : coordonnées GPS copiées aussi pour les places payées (itinéraire exact).
  return v && v.revealPolicy === "immediate" ? { name: v.name ?? "", address: v.address ?? "", ...(v.geo ? { geo: v.geo } : {}) } : null;
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
  const rules = await commissionRules();
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
    // Audit 23/11 : crédits du carnet de cette place, rendus à l'expiration : à reprendre si la place est reprise.
    const usedCredits = Number(r.pricing?.coverage?.carnetSeats ?? 0);
    const carnetDocRef = db.doc(`carnets/${r.userId}`);
    const [sess, lock, exp, redemption, carnet] = await Promise.all([
      tx.get(sessRef),
      tx.get(lockRef),
      tx.get(db.doc(`experiences/${r.experienceId}`)),
      promoCode ? tx.get(db.doc(`promoCodes/${promoCode}/redemptions/${r.userId}`)) : Promise.resolve(null),
      r.status === "expired" && usedCredits > 0 ? tx.get(carnetDocRef) : Promise.resolve(null),
    ]);
    // Code promo : compté une seule fois par personne, au moment où la place est confirmée.
    const countPromo = () => {
      if (promoCode && !redemption?.exists) redeemPromo(tx, promoCode, r.userId, res.id);
    };
    // Étape 21 : commission (figée à la réservation ; calculée maintenant si elle manque) et écriture au registre.
    // docs/22, décision 31 : plus de commission sur les activités d'organisateurs (anciennes réservations : celle figée).
    const commission = r.commission ?? null;
    const settle = () => writeSaleEntry(tx, res.id, { ...r, commission });
    const commissionField = commission && !r.commission ? { commission } : {};

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
      tx.update(resRef, { ...confirmFields(exp, pay.id), ...commissionField });
      countPromo();
      settle();
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
        // Crédits rendus à l'expiration : repris (sinon la place serait payée avec un crédit gardé). S'il n'en reste
        // plus assez (utilisés entre-temps), la place reste confirmée et l'écart est signalé à l'équipe.
        let carnetShortfall = 0;
        if (usedCredits > 0) {
          const available = Math.max(0, Number(carnet?.data()?.credits ?? 0));
          const take = Math.min(available, usedCredits);
          carnetShortfall = usedCredits - take;
          if (take > 0) {
            tx.update(carnetDocRef, { credits: FieldValue.increment(-take), updatedAt: FieldValue.serverTimestamp() });
            tx.set(carnetDocRef.collection("movements").doc(), { delta: -take, reason: "late_payment", reservationId: res.id, at: FieldValue.serverTimestamp() });
          }
        }
        tx.update(resRef, { ...confirmFields(exp, pay.id), latePayment: true, ...commissionField, ...(carnetShortfall > 0 ? { carnetShortfall } : {}) });
        if (carnetShortfall > 0) logger.error("Paiement tardif : crédits du carnet insuffisants", { reservationId: res.id, carnetShortfall });
        countPromo();
        settle();
        return { outcome: "confirmed", reservationId: res.id };
      }
    }
    // Plus de place (ou réservation annulée entre-temps) : remboursement intégral.
    return { outcome: "refunded", reservationId: res.id, refund: { amount: ev.amount, reason: "late_payment_no_seat" } };
  });

  // Facture + e-mail de confirmation (5c). En cas de remboursement automatique, la facture est émise avec l'avoir.
  if (decision.outcome === "confirmed") await afterPaymentSettled({ paymentId: ev.paymentId });
  // 18a : place confirmée → invitation à remplir le questionnaire de l'expérience (s'il y en a un).
  if (decision.outcome === "confirmed" && decision.reservationId) await notifyQuestionnaire(decision.reservationId).catch(() => undefined);
  if (decision.refund) await refundPayment(ev.paymentId, decision.refund.amount, decision.refund.reason);
  return { outcome: decision.outcome, reservationId: decision.reservationId, purpose: decision.purpose ?? "reservation" };
}

/**
 * Paiement d'un carnet ou d'un pass (docs/22 § 17.I) : à la réussite (montant vérifié), le pass est prolongé de sa
 * durée (à partir de sa fin s'il est en cours) ou les crédits du carnet sont ajoutés, dans la même transaction.
 * Anciens paiements d'abonnement (par mois) : convertis en pass de la même durée.
 */
async function applyMembershipPayment(
  tx: Transaction,
  ev: PaymentEvent,
  evRef: FirebaseFirestore.DocumentReference,
  payRef: FirebaseFirestore.DocumentReference,
  p: FirebaseFirestore.DocumentData,
): Promise<{ outcome: ApplyOutcome; purpose: "membership"; refund?: { amount: number; reason: string } }> {
  const logged = Object.fromEntries(Object.entries(ev).filter(([, v]) => v !== undefined));
  const base = { processedEventIds: FieldValue.arrayUnion(ev.id), updatedAt: FieldValue.serverTimestamp() };
  const ok = p.status === "initiated" && ev.status !== "failed" && ev.amount === p.amount && ev.currency === p.currency;
  const kind = p.kind === "carnet" ? "carnet" : "pass";
  const days = kind === "pass" ? Number(p.days) || (Number(p.months) || 12) * 30 : 0;
  // Lectures d'abord (règle des transactions), écritures ensuite.
  if (ok) await addPassAndCredits(tx, p.userId, { days, credits: kind === "carnet" ? Number(p.credits) || 3 : 0, carnetDays: kind === "carnet" ? Number(p.days) || 90 : undefined, source: "purchase", paymentId: payRef.id, amount: p.amount });
  tx.set(evRef, { ...logged, receivedAt: FieldValue.serverTimestamp() });
  if (p.status !== "initiated") {
    tx.update(payRef, base);
    return { outcome: "ignored", purpose: "membership" };
  }
  if (ev.status === "failed") {
    tx.update(payRef, { ...base, status: "failed", failureReason: ev.failureReason ?? "declined" });
    return { outcome: "failed", purpose: "membership" };
  }
  tx.update(payRef, { ...base, status: "succeeded", succeededAt: FieldValue.serverTimestamp(), providerRef: ev.providerRef ?? p.providerRef ?? null, paidAmount: ev.amount });
  if (!ok) return { outcome: "refunded", purpose: "membership", refund: { amount: ev.amount, reason: "amount_mismatch" } };
  tx.set(db.collection(`users/${p.userId}/notifications`).doc(), {
    type: "membership_active",
    title: kind === "pass" ? { fr: "Votre pass est actif", ar: "الباس الخاص بك مفعّل", en: "Your pass is active" } : { fr: "Votre carnet est prêt", ar: "دفترك جاهز", en: "Your pack is ready" },
    body: kind === "pass"
      ? { fr: "Vos places sont incluses : réservez sans payer les frais Wenzy.", ar: "أماكنك مشمولة: احجز دون دفع رسوم Wenzy.", en: "Your seats are included: book without paying Wenzy fees." }
      : { fr: "Vos crédits sont disponibles : 1 crédit par place.", ar: "رصيدك متاح: رصيد واحد لكل مكان.", en: "Your credits are ready: 1 credit per seat." },
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
