import { cmiApproved, cmiCents } from "@thecommunity/shared";
import { timingSafeEqual } from "node:crypto";
import { logger } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { db, REGION } from "../lib/admin";
import { applyPaymentEvent } from "./apply-event";
import { cmiCredentials, cmiHash } from "./providers/cmi";

/** Réponses attendues par le CMI (à confirmer avec sa documentation) : accepter / refuser la notification. */
export const CMI_ACK = "ACTION=POSTAUTH";
export const CMI_NACK = "FAILURE";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Traitement d'une notification du CMI (séparé de la fonction HTTP pour les tests). Vérifie la signature, retrouve le
 * paiement (oid), puis passe par EXACTEMENT le même traitement que les autres moyens de paiement (applyPaymentEvent :
 * idempotence, montant vérifié, place confirmée, ou remboursement si la place n'existe plus).
 */
export async function processCmiCallback(body: Record<string, string>, storeKey: string): Promise<{ reply: string; outcome?: string }> {
  const received = String(body.HASH ?? body.hash ?? "");
  if (!received || !same(cmiHash(body, storeKey), received)) {
    logger.error("CMI : signature invalide", { oid: body.oid });
    return { reply: CMI_NACK };
  }
  const paymentId = String(body.oid ?? "");
  const pay = paymentId ? (await db.doc(`payments/${paymentId}`).get()).data() : undefined;
  if (!pay || pay.provider !== "cmi") {
    logger.error("CMI : paiement inconnu", { oid: paymentId });
    return { reply: CMI_NACK };
  }
  const approved = cmiApproved(body);
  const result = await applyPaymentEvent({
    // Un même paiement peut recevoir plusieurs notifications (refus puis succès) : l'identifiant de transaction les distingue.
    id: `${paymentId}_${String(body.TransId || body.ProcReturnCode || "x")}_${approved ? "ok" : "ko"}`,
    provider: "cmi",
    paymentId,
    status: approved ? "succeeded" : "failed",
    amount: cmiCents(String(body.amount ?? "0")),
    currency: "MAD",
    providerRef: String(body.TransId ?? "") || undefined,
    failureReason: approved ? undefined : `cmi_${String(body.ProcReturnCode ?? "")}_${String(body.ErrMsg ?? "").slice(0, 80)}`,
  });
  return { reply: approved ? CMI_ACK : CMI_NACK, outcome: result.outcome };
}

/** Adresse de retour serveur du CMI (POST application/x-www-form-urlencoded). */
export const cmiCallback = onRequest({ region: REGION }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const cred = cmiCredentials();
  if (!cred) {
    logger.error("CMI : identifiants absents");
    res.status(503).type("text/plain").send(CMI_NACK);
    return;
  }
  const body = Object.fromEntries(Object.entries((req.body ?? {}) as Record<string, unknown>).map(([k, v]) => [k, String(Array.isArray(v) ? v[0] : v ?? "")]));
  try {
    const out = await processCmiCallback(body, cred.storeKey);
    res.status(200).type("text/plain").send(out.reply);
  } catch (e) {
    logger.error("CMI : notification non traitée", { oid: body.oid, error: String(e) });
    res.status(500).type("text/plain").send(CMI_NACK);
  }
});
