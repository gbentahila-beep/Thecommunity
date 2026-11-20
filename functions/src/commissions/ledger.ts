import { commissionAmount, commissionRefund, resolveCommission, zonedParts, MOROCCO_TIMEZONE, type CommissionRule, type CommissionSnapshot } from "@thecommunity/shared";
import { Timestamp, type DocumentData, type Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";

/**
 * Étape 21 — commissions : règles (lues avec un cache d'une minute), copie figée sur la réservation,
 * registre des commissions (commissionLedger) : une écriture « sale » à l'encaissement, une écriture « refund »
 * (montants négatifs) à chaque remboursement. Les reversements regroupent les écritures « dues ».
 */

let cache: { at: number; rules: CommissionRule[] } | null = null;
export async function commissionRules(): Promise<CommissionRule[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rules;
  const snap = await db.collection("commissionRules").get();
  cache = { at: Date.now(), rules: snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CommissionRule, "id">) })) };
  return cache.rules;
}
/** Après une modification des règles (même instance) : relire tout de suite. */
export function clearCommissionCache() {
  cache = null;
}

/** Date du jour au Maroc (AAAA-MM-JJ), pour les dates d'effet. */
export function moroccoToday(now = new Date()): string {
  const p = zonedParts(now, MOROCCO_TIMEZONE);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Copie de la commission pour une réservation d'activité d'organisateur (null pour The Host Club). */
export function commissionSnapshot(rules: CommissionRule[], e: DocumentData, experienceId: string, base: number, seats: number, now = new Date()) {
  const organizerId = e.organizerId as string | null | undefined;
  if (!organizerId) return null;
  const c: CommissionSnapshot = resolveCommission(rules, { experienceId, organizerId, categoryId: String(e.categoryId ?? ""), at: moroccoToday(now) });
  return { ...c, base, amount: commissionAmount(base, seats, c) };
}

/** Écriture « vente » (idempotente) quand une réservation d'organisateur est payée. À appeler dans la transaction. */
export function writeSaleEntry(tx: Transaction, reservationId: string, r: DocumentData) {
  if (!r.organizerId || !r.commission) return;
  const base = Number(r.commission.base ?? 0);
  if (base <= 0) return;
  tx.set(db.doc(`commissionLedger/sale_${reservationId}`), {
    kind: "sale",
    organizerId: r.organizerId,
    reservationId,
    experienceId: r.experienceId,
    sessionId: r.sessionId,
    sessionStartAt: r.sessionSnapshot?.startAt ?? null,
    gross: base,
    commission: Number(r.commission.amount ?? 0),
    payable: base - Number(r.commission.amount ?? 0),
    ratePercent: Number(r.commission.ratePercent ?? 0),
    status: "due",
    payoutId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Écriture « remboursement » : la part remboursée au participant n'est pas reversée à l'organisateur, et la
 * commission correspondante est rendue au prorata. La dernière écriture solde exactement la commission.
 */
export async function recordRefundEntry(reservationId: string, refunded: number) {
  if (refunded <= 0) return;
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r?.organizerId || !r.commission) return;
  const sale = await db.doc(`commissionLedger/sale_${reservationId}`).get();
  if (!sale.exists) return; // jamais encaissée : rien à corriger
  const base = Number(r.commission.base ?? 0);
  const commission = Number(r.commission.amount ?? 0);
  const previous = await db.collection("commissionLedger").where("reservationId", "==", reservationId).where("kind", "==", "refund").get();
  const refundedBefore = previous.docs.reduce((a, d) => a - Number(d.get("gross")), 0);
  const commissionBefore = previous.docs.reduce((a, d) => a - Number(d.get("commission")), 0);
  const gross = Math.min(refunded, Math.max(0, base - refundedBefore));
  if (gross <= 0) return;
  const back = refundedBefore + gross >= base ? commission - commissionBefore : commissionRefund(base, commission, gross);
  await db.collection("commissionLedger").doc(`refund_${reservationId}_${previous.size + 1}`).set({
    kind: "refund",
    organizerId: r.organizerId,
    reservationId,
    experienceId: r.experienceId,
    sessionId: r.sessionId,
    sessionStartAt: r.sessionSnapshot?.startAt ?? null,
    gross: -gross,
    commission: -back,
    payable: -(gross - back),
    ratePercent: Number(r.commission.ratePercent ?? 0),
    status: "due",
    payoutId: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/** Écritures prêtes à reverser : dues, dont l'activité est passée (au moins `delayDays` jours). */
export function eligibleForPayout(startAt: unknown, now: number, delayDays: number) {
  const t = startAt instanceof Timestamp ? startAt.toMillis() : typeof startAt === "string" ? Date.parse(startAt) : NaN;
  return Number.isFinite(t) && t <= now - delayDays * 86_400_000;
}
