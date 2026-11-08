import { paymentSettingsInputSchema } from "@thecommunity/shared";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { afterPaymentSettled } from "../invoices/issue";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { applyPaymentEvent } from "./apply-event";
import { bankTransferProvider } from "./providers/bank-transfer";

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/**
 * « Virement reçu » (étape 5h) : l'équipe a vu le virement arriver sur le compte (montant et référence).
 * Passe par le même traitement qu'une notification de prestataire : place confirmée (ou reprise / remboursée
 * si l'échéance est passée), code promo compté, facture et e-mail avec le billet. Idempotent. Journalisé.
 */
export const adminConfirmTransfer = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ paymentId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { paymentId } = parsed.data;
  const payRef = db.doc(`payments/${paymentId}`);
  const p = (await payRef.get()).data();
  if (!p || p.type !== "payment" || p.provider !== bankTransferProvider.id) throw new HttpsError("not-found", "Virement introuvable.", { reason: "not_found" });
  if (p.status !== "initiated") refuse("already_processed", "Ce virement a déjà été traité.");
  await payRef.update({ receivedBy: actor.uid, receivedAt: FieldValue.serverTimestamp() });
  const result = await applyPaymentEvent({
    id: `${paymentId}_received`,
    provider: bankTransferProvider.id,
    paymentId,
    status: "succeeded",
    amount: p.amount,
    currency: p.currency,
    providerRef: p.reference ?? undefined,
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "payment.transfer.received", targetType: "payment", targetId: paymentId, after: { reference: p.reference ?? null, amount: p.amount, outcome: result.outcome } });
  return { outcome: result.outcome, reservationId: result.reservationId ?? null, purpose: result.purpose ?? "reservation" };
});

/**
 * Remboursement d'un paiement par virement : fait à la main par l'équipe (virement retour, hors site — aucune
 * coordonnée bancaire de client n'est enregistrée). L'équipe le marque « effectué » : avoir + e-mail. Journalisé.
 */
export const adminCompleteManualRefund = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ refundId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { refundId } = parsed.data;
  const refRef = db.doc(`payments/${refundId}`);
  const done = await db.runTransaction(async (tx) => {
    const r = (await tx.get(refRef)).data();
    if (!r || r.type !== "refund" || r.provider !== bankTransferProvider.id) throw new HttpsError("not-found", "Remboursement introuvable.", { reason: "not_found" });
    if (r.status !== "initiated") refuse("already_processed", "Ce remboursement est déjà marqué effectué.");
    const parentRef = db.doc(`payments/${r.parentPaymentId}`);
    const parent = (await tx.get(parentRef)).data();
    const before = (await tx.get(db.collection("payments").where("parentPaymentId", "==", r.parentPaymentId).where("status", "==", "succeeded"))).docs
      .reduce((a, d) => a + (d.data().amount as number), 0);
    tx.update(refRef, { status: "succeeded", completedBy: actor.uid, completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    if (parent) tx.update(parentRef, { status: before + r.amount >= parent.amount ? "refunded" : "partially_refunded", updatedAt: FieldValue.serverTimestamp() });
    return { amount: r.amount as number, parentPaymentId: r.parentPaymentId as string };
  });
  await afterPaymentSettled({ refundId });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "payment.refund.manual_done", targetType: "payment", targetId: refundId, after: done });
  return { ok: true };
});

/**
 * Mode de paiement (super-admin) : paiement de TEST ou virement bancaire. Le virement exige des coordonnées
 * complètes (titulaire, banque, RIB de 24 chiffres). Journalisé (avant / après, RIB masqué dans le journal).
 */
export const adminSavePaymentSettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = paymentSettingsInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  const before = (await db.doc("settings/payment").get()).data() ?? null;
  const batch = db.batch();
  if (v.method === "bank_transfer") {
    batch.set(db.doc("settings/bankTransfer"), { ...v.bank, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
    batch.set(db.doc("settings/payment"), { provider: bankTransferProvider.id, mode: "live", updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  } else {
    batch.set(db.doc("settings/payment"), { provider: "sandbox", mode: "test", updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  }
  await batch.commit();
  const masked = v.method === "bank_transfer" ? { holder: v.bank.holder, bank: v.bank.bank, rib: `…${v.bank.rib.slice(-4)}`, deadlineHours: v.bank.deadlineHours, cutoffHours: v.bank.cutoffHours } : null;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.payment", targetType: "settings", targetId: "payment", before: before ? { provider: before.provider, mode: before.mode } : null, after: { method: v.method, bank: masked } });
  return { ok: true };
});
