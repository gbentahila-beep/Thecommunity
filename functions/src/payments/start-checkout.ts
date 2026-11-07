import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { paymentSettings, providerFor } from "./provider";

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
  await Promise.all([
    payRef.update({ providerRef: checkout.providerRef ?? null }),
    resRef.update({ paymentId: payRef.id, updatedAt: FieldValue.serverTimestamp() }),
  ]);
  return { paymentId: payRef.id, redirectUrl: checkout.redirectUrl };
});
