import type { PaymentProvider } from "../provider";

/**
 * Adaptateur de TEST (aucun argent, aucune carte).
 * Le « prestataire » est une page du site clairement signalée comme test (/paiement-test/…),
 * dont les boutons appellent la callable sandboxCompletePayment. Celle-ci passe par EXACTEMENT
 * le même traitement qu'une notification de vrai prestataire (applyPaymentEvent).
 * Refusé par le serveur si settings/payment n'est pas en mode « test ».
 */
export const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  async createCheckout({ paymentId }) {
    return { redirectUrl: `/paiement-test/${paymentId}`, providerRef: `sandbox_${paymentId}` };
  },
  async refund({ paymentId }) {
    return { status: "succeeded", providerRef: `sandbox_refund_${paymentId}_${Date.now()}` };
  },
};
