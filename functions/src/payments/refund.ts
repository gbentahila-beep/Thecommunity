import { logger } from "firebase-functions/v2";
import { afterPaymentSettled } from "../invoices/issue";
import { db, FieldValue } from "../lib/admin";
import { providerFor } from "./provider";

/**
 * Rembourse tout ou partie d'un paiement réussi via son prestataire et l'enregistre
 * (paiement « refund » rattaché, statut du paiement d'origine). Ne modifie pas la réservation.
 */
export async function issueRefund(paymentId: string, amount: number, reason: string): Promise<{ status: "succeeded" | "pending" }> {
  const payRef = db.doc(`payments/${paymentId}`);
  const p = (await payRef.get()).data();
  if (!p || p.status !== "succeeded" || amount <= 0) throw new Error(`Remboursement impossible pour ${paymentId}`);
  const provider = providerFor(p.provider);
  const result = await provider.refund({ paymentId, providerRef: p.providerRef ?? undefined, amount, currency: p.currency });
  const batch = db.batch();
  const refundRef = db.collection("payments").doc();
  batch.set(refundRef, {
    type: "refund",
    parentPaymentId: paymentId,
    reservationId: p.reservationId ?? null,
    purpose: p.purpose ?? "reservation",
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
  await batch.commit();
  logger.info("Remboursement", { paymentId, amount, reason, status: result.status });
  // Avoir + e-mail (5c). Un remboursement encore en cours chez le prestataire aura son avoir à sa confirmation.
  if (result.status === "succeeded") await afterPaymentSettled({ refundId: refundRef.id });
  return { status: result.status };
}
