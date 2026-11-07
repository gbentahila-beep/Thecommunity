"use client";

/**
 * Envoie le navigateur vers la page de paiement : adresse du prestataire (absolue) ou,
 * pour l'adaptateur de test, une page du site (chemin relatif, préfixé par la langue).
 */
export function goToCheckout(redirectUrl: string, push: (href: string) => void) {
  if (/^https:\/\//.test(redirectUrl)) window.location.assign(redirectUrl);
  else if (redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) push(redirectUrl);
  else throw new Error("Adresse de paiement invalide");
}
