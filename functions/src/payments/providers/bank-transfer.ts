import { transferReference } from "@thecommunity/shared";
import { db, FieldValue } from "../../lib/admin";
import type { PaymentProvider } from "../provider";

/**
 * Virement bancaire (étape 5h, phase 1). Aucun prestataire externe, aucun frais de passerelle :
 * - « paiement » = une référence unique réservée dans transferRefs/{ref} (création atomique : jamais deux fois la même) ;
 * - le client est envoyé vers la page des instructions (/paiement/virement/{paymentId}) ;
 * - la confirmation vient UNIQUEMENT de l'équipe (« Virement reçu », adminConfirmTransfer) ;
 * - un remboursement se fait à la main, hors site : il reste « en cours » jusqu'à ce que l'équipe le marque effectué.
 */
export const bankTransferProvider: PaymentProvider = {
  id: "bank_transfer",
  async createCheckout({ paymentId }) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const ref = transferReference();
      const ok = await db
        .doc(`transferRefs/${ref}`)
        .create({ paymentId, createdAt: FieldValue.serverTimestamp() })
        .then(() => true, () => false);
      if (ok) return { redirectUrl: `/paiement/virement/${paymentId}`, providerRef: ref };
    }
    throw new Error("Impossible de générer une référence de virement unique");
  },
  async refund() {
    return { status: "pending" };
  },
};
