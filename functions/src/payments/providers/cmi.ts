import { CMI_CURRENCY_MAD, CMI_GATEWAYS, cmiAmount, cmiHashInput } from "@thecommunity/shared";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../../lib/admin";
import { REGION } from "../../lib/admin";
import { SITE_URL } from "../../invoices/format";
import type { PaymentProvider } from "../provider";

/**
 * Audit du 23/11 (lot 6) — adaptateur CMI (carte bancaire, 3D Secure), « 3D Pay Hosting ».
 * Réglages : settings/payment = { provider: "cmi", mode: "test" | "live" } ; identifiants en secrets Cloud
 * (CMI_CLIENT_ID, CMI_STORE_KEY — jamais dans le code ni la base). Adresse de retour serveur : CMI_CALLBACK_URL,
 * sinon la fonction cmiCallback du projet.
 * - paiement : les champs signés sont préparés ici et enregistrés sur le paiement ; la page /paiement/cmi/{id} les
 *   envoie au CMI (formulaire POST). Seule la notification serveur du CMI (cmiCallback) confirme la place ;
 * - remboursement : « en cours », à faire depuis l'espace commerçant CMI puis à marquer effectué dans
 *   « Remboursements » (comme un virement), tant que l'API de remboursement du CMI n'est pas ouverte.
 */
/**
 * Secrets CMI liés aux fonctions de paiement SEULEMENT quand CMI_ENABLED=true (fichier functions/.env.<projet> lu au
 * déploiement) : déclarer un secret qui n'existe pas encore dans Secret Manager ferait échouer tout le déploiement.
 */
export const CMI_SECRETS = ["CMI_CLIENT_ID", "CMI_STORE_KEY"];
export const cmiSecretsOption = (): { secrets?: string[] } => (process.env.CMI_ENABLED === "true" ? { secrets: CMI_SECRETS } : {});

export function cmiCredentials(): { clientId: string; storeKey: string } | null {
  const clientId = process.env.CMI_CLIENT_ID ?? "";
  const storeKey = process.env.CMI_STORE_KEY ?? "";
  return clientId && storeKey ? { clientId, storeKey } : null;
}

export function cmiHash(params: Record<string, string>, storeKey: string): string {
  return createHash("sha512").update(cmiHashInput(params, storeKey), "utf8").digest("base64");
}

export function cmiCallbackUrl(): string {
  return process.env.CMI_CALLBACK_URL || `https://${REGION}-${process.env.GCLOUD_PROJECT ?? "demo-thecommunity"}.cloudfunctions.net/cmiCallback`;
}

/** Champs signés du formulaire envoyé au CMI pour un paiement. */
export async function cmiFormFor(o: { paymentId: string; amount: number; description: string; mode: "test" | "live"; locale?: string; email?: string; name?: string }) {
  const cred = cmiCredentials();
  if (!cred) throw new Error("Identifiants CMI absents (CMI_CLIENT_ID, CMI_STORE_KEY)");
  const back = (r: "ok" | "echec") => `${SITE_URL}/api/cmi/retour?paiement=${encodeURIComponent(o.paymentId)}&r=${r}`;
  const fields: Record<string, string> = {
    clientid: cred.clientId,
    storetype: "3D_PAY_HOSTING",
    TranType: "PreAuth",
    hashAlgorithm: "ver3",
    currency: CMI_CURRENCY_MAD,
    amount: cmiAmount(o.amount),
    oid: o.paymentId,
    okUrl: back("ok"),
    failUrl: back("echec"),
    callbackUrl: cmiCallbackUrl(),
    shopurl: SITE_URL,
    lang: o.locale === "ar" || o.locale === "en" ? o.locale : "fr",
    rnd: randomBytes(12).toString("hex"),
    encoding: "UTF-8",
    refreshtime: "5",
    AutoRedirect: "true",
    CallbackResponse: "true",
    description: o.description.slice(0, 120),
    ...(o.email ? { email: o.email } : {}),
    ...(o.name ? { BillToName: o.name.slice(0, 60) } : {}),
  };
  fields.HASH = cmiHash(fields, cred.storeKey);
  return { action: CMI_GATEWAYS[o.mode], fields };
}

export const cmiProvider: PaymentProvider = {
  id: "cmi",
  async createCheckout({ paymentId, amount, description }) {
    const pay = (await db.doc(`payments/${paymentId}`).get()).data() ?? {};
    const user = pay.userId ? (await db.doc(`users/${pay.userId}`).get()).data() ?? {} : {};
    const form = await cmiFormFor({ paymentId, amount, description, mode: pay.mode === "live" ? "live" : "test", locale: String(user.locale ?? "fr"), email: user.email as string | undefined, name: [user.firstName, user.lastName].filter(Boolean).join(" ") });
    await db.doc(`payments/${paymentId}`).update({ cmiForm: form });
    return { redirectUrl: `/paiement/cmi/${paymentId}`, providerRef: `cmi_${paymentId}` };
  },
  async refund() {
    return { status: "pending" };
  },
};
