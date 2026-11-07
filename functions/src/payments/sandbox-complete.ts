import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { applyPaymentEvent } from "./apply-event";
import { paymentSettings } from "./provider";
import { sandboxProvider } from "./providers/sandbox";

const input = z.object({
  paymentId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  outcome: z.enum(["succeeded", "failed"]),
});

/**
 * Adaptateur de TEST uniquement : simule la réponse du prestataire pour SON propre paiement.
 * Refusé dès que settings/payment n'est pas { provider: "sandbox", mode: "test" } — donc
 * inutilisable en production. Passe par le même traitement qu'un vrai webhook.
 */
export const sandboxCompletePayment = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = input.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const settings = await paymentSettings();
  if (settings.provider !== sandboxProvider.id || settings.mode !== "test") {
    throw new HttpsError("permission-denied", "Paiement de test désactivé.", { reason: "sandbox_disabled" });
  }
  const { paymentId, outcome } = parsed.data;
  const pay = (await db.doc(`payments/${paymentId}`).get()).data();
  if (!pay || pay.userId !== uid || pay.provider !== sandboxProvider.id) {
    throw new HttpsError("not-found", "Paiement introuvable.", { reason: "not_found" });
  }
  if (pay.status !== "initiated") throw new HttpsError("failed-precondition", "Paiement déjà traité.", { reason: "already_processed" });
  const result = await applyPaymentEvent({
    id: `${paymentId}_${outcome}`,
    provider: sandboxProvider.id,
    paymentId,
    status: outcome,
    amount: pay.amount,
    currency: pay.currency,
    providerRef: pay.providerRef ?? undefined,
    failureReason: outcome === "failed" ? "test_declined" : undefined,
  });
  return { outcome: result.outcome, reservationId: result.reservationId };
});
