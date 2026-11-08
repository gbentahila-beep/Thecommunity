import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { transferDeadline } from "@thecommunity/shared";
import { invalidArgument, requireAuth } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { bankDetails, paymentSettings, providerFor } from "./provider";
import { bankTransferProvider } from "./providers/bank-transfer";
import { sendTransferInstructions } from "./transfer-mail";

const input = z.object({ reservationId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) });

/**
 * Démarre le paiement d'une réservation « pending_payment » encore bloquée.
 * Le montant est relu en base (jamais fourni par le navigateur). Renvoie l'adresse du prestataire.
 */
export const startCheckout = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = input.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const settings = await paymentSettings();

  const resRef = db.doc(`reservations/${parsed.data.reservationId}`);
  const res = await resRef.get();
  const r = res.data();
  if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  if (r.status !== "pending_payment") throw new HttpsError("failed-precondition", "Rien à payer.", { reason: r.status === "confirmed" ? "already_paid" : "not_payable" });
  if ((r.holdExpiresAt as Timestamp).toMillis() <= Date.now()) {
    throw new HttpsError("failed-precondition", "Le délai de paiement est dépassé.", { reason: "hold_expired" });
  }

  const provider = providerFor(settings.provider);
  // Virement (5h) : une seule référence par réservation ; échéance = 48 h, au plus tard 24 h avant l'expérience.
  const isTransfer = provider.id === bankTransferProvider.id;
  let deadline: Date | null = null;
  if (isTransfer) {
    if (r.paymentId) {
      const prev = (await db.doc(`payments/${r.paymentId}`).get()).data();
      if (prev?.provider === bankTransferProvider.id && prev.status === "initiated") {
        return { paymentId: r.paymentId as string, redirectUrl: `/paiement/virement/${r.paymentId}` };
      }
    }
    const bank = await bankDetails();
    deadline = transferDeadline(new Date(), (r.sessionSnapshot.startAt as Timestamp).toDate(), bank ?? {});
    if (!deadline) refuse("transfer_too_late", "Cette date est trop proche pour un paiement par virement.");
  }
  const payRef = db.collection("payments").doc();
  await payRef.set({
    reservationId: res.id,
    userId: uid,
    type: "payment",
    provider: provider.id,
    mode: settings.mode,
    providerRef: null,
    amount: r.pricing.total,
    currency: r.pricing.currency,
    status: "initiated",
    ...(deadline ? { transferDeadline: Timestamp.fromDate(deadline) } : {}),
    processedEventIds: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const title = r.sessionSnapshot?.title?.fr ?? "The Host Club";
  const checkout = await provider.createCheckout({
    paymentId: payRef.id,
    reservationId: res.id,
    amount: r.pricing.total,
    currency: r.pricing.currency,
    description: `${title} — ${r.seats} place(s)`,
  });
  if (isTransfer && deadline) {
    // La place reste bloquée jusqu'à l'échéance du virement (relecture : rien si la réservation a changé entre-temps).
    const ok = await db.runTransaction(async (tx) => {
      const cur = (await tx.get(resRef)).data();
      if (!cur || cur.status !== "pending_payment" || (cur.holdExpiresAt as Timestamp).toMillis() <= Date.now()) return false;
      tx.update(resRef, {
        paymentId: payRef.id,
        paymentMethod: bankTransferProvider.id,
        transferReference: checkout.providerRef,
        holdExpiresAt: Timestamp.fromDate(deadline!),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(payRef, { providerRef: checkout.providerRef ?? null, reference: checkout.providerRef ?? null });
      return true;
    });
    if (!ok) {
      await payRef.update({ status: "failed", failureReason: "hold_expired", updatedAt: FieldValue.serverTimestamp() });
      throw new HttpsError("failed-precondition", "Le délai de paiement est dépassé.", { reason: "hold_expired" });
    }
    await sendTransferInstructions(payRef.id);
    return { paymentId: payRef.id, redirectUrl: checkout.redirectUrl };
  }
  await Promise.all([
    payRef.update({ providerRef: checkout.providerRef ?? null }),
    resRef.update({ paymentId: payRef.id, updatedAt: FieldValue.serverTimestamp() }),
  ]);
  return { paymentId: payRef.id, redirectUrl: checkout.redirectUrl };
});
