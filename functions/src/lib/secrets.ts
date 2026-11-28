/**
 * Audit du 23/11 — secrets Cloud des services externes, liés à TOUTES les fonctions seulement quand le service est
 * activé (fichier functions/.env.<projet>, lu par l'outil Firebase au déploiement) :
 *   BREVO_ENABLED=true    → BREVO_API_KEY (envoi réel des e-mails)
 *   CMI_ENABLED=true      → CMI_CLIENT_ID, CMI_STORE_KEY (paiement par carte)
 *   WHATSAPP_ENABLED=true → WHATSAPP_TOKEN (envoi WhatsApp automatique)
 * Déclarer un secret qui n'existe pas encore dans Secret Manager ferait échouer tout le déploiement : d'où les interrupteurs.
 */
export function enabledSecrets(env: Record<string, string | undefined> = process.env): string[] {
  return [
    ...(env.BREVO_ENABLED === "true" ? ["BREVO_API_KEY"] : []),
    ...(env.CMI_ENABLED === "true" ? ["CMI_CLIENT_ID", "CMI_STORE_KEY"] : []),
    ...(env.WHATSAPP_ENABLED === "true" ? ["WHATSAPP_TOKEN"] : []),
  ];
}
