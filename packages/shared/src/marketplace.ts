import { z } from "zod";
import { commissionAmount } from "./commission";

/**
 * Étape 22 — modes de paiement des activités d'organisateurs, politiques d'annulation, demandes de remboursement.
 *
 * Modes (choisis par l'organisateur parmi ceux que l'équipe a activés) :
 * - A « full_online » : tout est payé en ligne ; The Host Club garde sa commission et reverse le reste.
 * - B « deposit »     : un acompte (pourcentage du prix) est payé en ligne, le solde sur place à l'organisateur.
 *                       L'acompte couvre au moins la commission (calculée sur le prix total).
 * - C « booking_fee » : seuls des frais de réservation sont payés en ligne (= la commission de The Host Club),
 *                       le prix de l'activité est payé sur place à l'organisateur.
 * Les parts « sur place » réutilisent la tarification en deux parts (étape 11) : affichage « X maintenant · Y sur place ».
 * Montants en centimes.
 */

export const PAYMENT_MODELS = ["full_online", "deposit", "booking_fee"] as const;
export type PaymentModel = (typeof PAYMENT_MODELS)[number];

export const PAYMENT_MODEL_LABELS: Record<PaymentModel, { title: string; text: string }> = {
  full_online: { title: "Tout en ligne", text: "Le participant paie tout à la réservation. Vous recevez le montant, commission déduite, après l'activité." },
  deposit: { title: "Acompte en ligne", text: "Un acompte à la réservation (au moins la commission), le solde payé sur place." },
  booking_fee: { title: "Frais de réservation en ligne", text: "Seule la commission est payée en ligne ; vous encaissez le prix sur place." },
};

/** Acompte : entre 10 % et 90 % du prix. */
export const DEPOSIT_MIN = 10;
export const DEPOSIT_MAX = 90;
/** Frais de réservation minimum (1 DH). */
export const MIN_BOOKING_FEE = 100;

/** Partage d'un prix par place (centimes) entre la part en ligne et la part sur place, selon le mode. */
export function splitForModel(
  model: PaymentModel,
  totalUnit: number,
  o: { depositPercent?: number; ratePercent: number; fixedPerSeat?: number },
): { onlineUnit: number; onSiteUnit: number } {
  const commission = commissionAmount(totalUnit, 1, { ratePercent: o.ratePercent, fixedPerSeat: o.fixedPerSeat ?? 0 });
  if (model === "full_online" || totalUnit <= 0) return { onlineUnit: totalUnit, onSiteUnit: 0 };
  if (model === "deposit") {
    const pct = Math.min(DEPOSIT_MAX, Math.max(DEPOSIT_MIN, o.depositPercent ?? 30));
    const online = Math.min(totalUnit, Math.max(commission, Math.round((totalUnit * pct) / 100)));
    return { onlineUnit: online, onSiteUnit: totalUnit - online };
  }
  const fee = Math.min(totalUnit, Math.max(MIN_BOOKING_FEE, commission));
  return { onlineUnit: fee, onSiteUnit: totalUnit - fee };
}

/** Commission d'une réservation dont une partie se paie sur place : calculée sur le prix total, jamais plus que l'encaissé. */
export function commissionOnTotal(onlinePaid: number, activityTotal: number, seats: number, c: { ratePercent: number; fixedPerSeat: number }) {
  return Math.min(onlinePaid, commissionAmount(activityTotal, seats, c));
}

/* ——— Politiques d'annulation ——— */

export const cancellationPolicyInputSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{2,30}$/, "slug"),
    labelFr: z.string().trim().min(3, "required").max(80, "tooLong"),
    labelEn: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
    labelAr: z.string().trim().max(80, "tooLong").optional().or(z.literal("")),
    rules: z
      .array(z.object({ hoursBefore: z.coerce.number().int().min(0).max(24 * 60), refundPercent: z.coerce.number().int().min(0).max(100) }))
      .min(1, "required")
      .max(6, "tooMany"),
  })
  .superRefine((v, ctx) => {
    const hours = v.rules.map((r) => r.hoursBefore);
    if (new Set(hours).size !== hours.length) ctx.addIssue({ code: "custom", path: ["rules"], message: "duplicateTier" });
    // Plus on annule tard, moins on est remboursé (jamais l'inverse).
    const sorted = [...v.rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
    for (let i = 1; i < sorted.length; i++) if (sorted[i]!.refundPercent > sorted[i - 1]!.refundPercent) ctx.addIssue({ code: "custom", path: ["rules"], message: "notDecreasing" });
  });
export type CancellationPolicyInput = z.input<typeof cancellationPolicyInputSchema>;

/** « 48 h avant : 100 % · moins de 48 h : 0 % » (affichage). */
export function describePolicy(rules: { hoursBefore: number; refundPercent: number }[]): string {
  const sorted = [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore);
  const h = (n: number) => (n >= 72 && n % 24 === 0 ? `${n / 24} jours` : `${n} h`);
  return sorted
    .map((r, i) => (r.hoursBefore > 0 ? `${h(r.hoursBefore)} avant ou plus : ${r.refundPercent} %` : `moins de ${h(sorted[i - 1]?.hoursBefore ?? 0)} : ${r.refundPercent} %`))
    .join(" · ");
}

/* ——— Demandes de remboursement ——— */

export const REFUND_REQUEST_REASONS = ["not_delivered", "different", "cancelled_by_organizer", "safety", "other"] as const;
export type RefundRequestReason = (typeof REFUND_REQUEST_REASONS)[number];

export const refundRequestSchema = z.object({
  reservationId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
  reason: z.enum(REFUND_REQUEST_REASONS),
  message: z.string().trim().min(10, "tooShort").max(1000, "tooLong"),
});

export const refundDecisionSchema = z
  .object({
    requestId: z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),
    decision: z.enum(["full", "partial", "decline"]),
    /** Montant remboursé en DH (remboursement partiel). */
    amountDh: z.coerce.number().min(0.01, "min0").max(1_000_000).optional(),
    message: z.string().trim().max(800, "tooLong").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.decision === "partial" && v.amountDh === undefined) ctx.addIssue({ code: "custom", path: ["amountDh"], message: "required" });
    if (v.decision === "decline" && (v.message ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["message"], message: "required" });
  });

/** Une demande est possible jusqu'à 7 jours après l'activité (conditions de vente des activités des organisateurs, art. 4). */
export const REFUND_REQUEST_DAYS = 7;
export function canRequestRefund(r: { status: string; sessionStartAt: string; refundedAmount?: number; paidAmount: number }, now: Date): boolean {
  if (!["confirmed", "attended", "no_show"].includes(r.status)) return false;
  if ((r.refundedAmount ?? 0) >= r.paidAmount || r.paidAmount <= 0) return false;
  return now.getTime() <= new Date(r.sessionStartAt).getTime() + REFUND_REQUEST_DAYS * 86_400_000;
}
