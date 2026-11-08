import { HttpsError } from "firebase-functions/v2/https";
import { db } from "../lib/admin";
import { bankDetailsSchema, type BankDetails } from "@thecommunity/shared";
import { bankTransferProvider } from "./providers/bank-transfer";
import { sandboxProvider } from "./providers/sandbox";

/**
 * Interface commune à tous les prestataires de paiement (docs/02, docs/06).
 * Le prestataire marocain retenu (CMI, Payzone, YouCan Pay…) sera un adaptateur de plus (phase 5) :
 * le reste du code n'en dépend pas. Aucune donnée de carte ne transite par nos serveurs.
 */
export type CheckoutRequest = {
  paymentId: string;
  reservationId: string;
  amount: number; // centimes
  currency: string;
  description: string;
};

export interface PaymentProvider {
  id: string;
  /** Crée le paiement chez le prestataire et renvoie l'adresse où envoyer le navigateur. */
  createCheckout(req: CheckoutRequest): Promise<{ redirectUrl: string; providerRef?: string }>;
  /** Rembourse tout ou partie d'un paiement réussi. */
  refund(req: { paymentId: string; providerRef?: string; amount: number; currency: string }): Promise<{
    status: "succeeded" | "pending";
    providerRef?: string;
  }>;
}

const PROVIDERS: Record<string, PaymentProvider> = { [sandboxProvider.id]: sandboxProvider, [bankTransferProvider.id]: bankTransferProvider };

export type PaymentSettings = { provider: string; mode: "test" | "live" };

/**
 * Réglage settings/payment (lisible par les admins seulement, modifié par un super-admin).
 * Absent ou incomplet : le paiement est désactivé (jamais de prestataire par défaut).
 */
export async function paymentSettings(): Promise<PaymentSettings> {
  const s = (await db.doc("settings/payment").get()).data();
  const provider = typeof s?.provider === "string" ? s.provider : "";
  const mode = s?.mode === "live" ? "live" : s?.mode === "test" ? "test" : null;
  if (!PROVIDERS[provider] || !mode) {
    throw new HttpsError("failed-precondition", "Paiement indisponible.", { reason: "payments_unavailable" });
  }
  // L'adaptateur de test ne peut jamais fonctionner en mode réel.
  if (provider === sandboxProvider.id && mode !== "test") {
    throw new HttpsError("failed-precondition", "Paiement indisponible.", { reason: "payments_unavailable" });
  }
  // Virement : jamais sans coordonnées bancaires complètes (le client doit savoir où virer).
  if (provider === bankTransferProvider.id && !(await bankDetails())) {
    throw new HttpsError("failed-precondition", "Paiement indisponible.", { reason: "payments_unavailable" });
  }
  return { provider, mode };
}

/** Coordonnées bancaires de The Host Club (settings/bankTransfer), ou null si absentes ou incomplètes. */
export async function bankDetails(): Promise<BankDetails | null> {
  const parsed = bankDetailsSchema.safeParse((await db.doc("settings/bankTransfer").get()).data() ?? {});
  return parsed.success ? parsed.data : null;
}

export function providerFor(id: string): PaymentProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Prestataire de paiement inconnu : ${id}`);
  return p;
}
