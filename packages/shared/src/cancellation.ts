import type { CancellationPolicy } from "./types";

/**
 * Politique par défaut validée (décision D6) : remboursement intégral jusqu'à
 * 48 h avant le début, aucun remboursement ensuite.
 */
export const DEFAULT_CANCELLATION_POLICY: CancellationPolicy = {
  id: "standard-48h",
  label: { fr: "Annulation gratuite jusqu'à 48 h avant", ar: "إلغاء مجاني حتى 48 ساعة قبل الموعد" },
  rules: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 0, refundPercent: 0 },
  ],
};

/**
 * Pourcentage remboursé si l'utilisateur annule à `now` pour une session commençant à `startAt`.
 * Les règles sont évaluées de la plus large à la plus courte : la première dont
 * le délai est respecté s'applique.
 */
export function refundPercentFor(policy: CancellationPolicy, startAt: Date, now: Date): number {
  const hoursLeft = (startAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft <= 0) return 0;
  const rules = [...policy.rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  for (const rule of rules) {
    if (hoursLeft >= rule.hoursBefore) return rule.refundPercent;
  }
  return 0;
}

/** Montant remboursé en centimes, arrondi à l'inférieur (jamais plus que payé). */
export function refundAmountFor(
  policy: CancellationPolicy,
  paidAmount: number,
  startAt: Date,
  now: Date,
): number {
  return Math.floor((paidAmount * refundPercentFor(policy, startAt, now)) / 100);
}
