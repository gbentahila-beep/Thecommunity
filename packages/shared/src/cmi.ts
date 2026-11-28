/**
 * Audit du 23/11 (lot 6) — paiement par carte avec le CMI (Centre Monétique Interbancaire), mode « 3D Pay Hosting » :
 * le navigateur est envoyé sur la page de paiement du CMI (aucune donnée de carte chez Wenzy), le CMI appelle ensuite
 * notre adresse de retour serveur (callback) qui fait foi.
 *
 * Signature « ver3 » (format standard CMI / Nestpay) : noms des paramètres triés sans tenir compte de la casse
 * (sans « hash » ni « encoding »), valeurs échappées (« \\ » → « \\\\ », « | » → « \\| ») et jointes par « | »,
 * puis « | » + clé du magasin échappée ; empreinte SHA-512 encodée en base64.
 * ⚠ À vérifier ligne par ligne avec la documentation remise par le CMI à la signature du contrat.
 */
export const CMI_GATEWAYS = {
  test: "https://testpayment.cmi.co.ma/fim/est3Dgate",
  live: "https://payment.cmi.co.ma/fim/est3Dgate",
} as const;
/** Code ISO 4217 numérique du dirham. */
export const CMI_CURRENCY_MAD = "504";

const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");

/** Texte à signer (avant SHA-512) : utile pour les tests et pour comparer avec un exemple fourni par le CMI. */
export function cmiHashInput(params: Record<string, string>, storeKey: string): string {
  const keys = Object.keys(params)
    .filter((k) => !["hash", "encoding"].includes(k.toLowerCase()))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "en"));
  return [...keys.map((k) => esc(String(params[k] ?? ""))), esc(storeKey)].join("|");
}

/** Montant au format CMI (« 35.00 ») depuis des centimes. */
export const cmiAmount = (cents: number) => (cents / 100).toFixed(2);
/** Centimes depuis le montant renvoyé par le CMI (« 35.00 », « 35,00 » ou « 35 »). */
export const cmiCents = (amount: string) => Math.round(Number(String(amount).replace(",", ".")) * 100);

/** Paiement accepté selon la réponse du CMI : code retour « 00 » et réponse « Approved ». */
export function cmiApproved(p: Record<string, string>): boolean {
  return String(p.ProcReturnCode ?? "") === "00" && String(p.Response ?? "").toLowerCase() === "approved";
}
