import { z } from "zod";
import { CATEGORY_ID_PATTERN } from "./constants";

/**
 * Étape 21 — commissions de The Host Club sur les activités des organisateurs.
 *
 * Règles (commissionRules) : globale, par catégorie, par organisateur ou par activité, chacune avec une date
 * d'effet. La plus précise l'emporte (activité > organisateur > catégorie > globale) ; à précision égale, la plus
 * récente déjà en vigueur. Le résultat est COPIÉ sur la réservation au moment où elle est créée : un changement de
 * taux ne touche jamais une réservation existante (contrat organisateur, art. 5).
 *
 * Base : ce que le participant paie en ligne pour l'activité, hors frais de service (qui reviennent entièrement
 * à The Host Club). Montants en centimes.
 */

export const COMMISSION_SCOPES = ["experience", "organizer", "category", "global"] as const;
export type CommissionScope = (typeof COMMISSION_SCOPES)[number];

export type CommissionRule = {
  id: string;
  scope: CommissionScope;
  /** Identifiant visé (activité, organisateur, catégorie) ; absent pour la règle globale. */
  targetId?: string | null;
  /** Pourcentage de la base (0 à 100, deux décimales). */
  ratePercent: number;
  /** Montant fixe par place, en centimes (facultatif). */
  fixedPerSeat?: number;
  /** Date d'effet (AAAA-MM-JJ, heure du Maroc) : s'applique aux réservations créées à partir de ce jour. */
  effectiveFrom: string;
  /** Règle désactivée (gardée pour l'historique). */
  active?: boolean;
  note?: string;
};

/** Taux appliqué en l'absence de toute règle (hypothèse, modifiable dans le back-office). */
export const DEFAULT_COMMISSION_PERCENT = 15;

export type CommissionSnapshot = { ruleId: string | null; scope: CommissionScope | "default"; ratePercent: number; fixedPerSeat: number };

const RANK: Record<CommissionScope, number> = { experience: 0, organizer: 1, category: 2, global: 3 };

/** Règle applicable à une réservation créée à la date `at` (AAAA-MM-JJ). */
export function resolveCommission(
  rules: CommissionRule[],
  ctx: { experienceId: string; organizerId: string; categoryId: string; at: string },
): CommissionSnapshot {
  const target: Record<CommissionScope, string | null> = { experience: ctx.experienceId, organizer: ctx.organizerId, category: ctx.categoryId, global: null };
  const candidates = rules
    .filter((r) => r.active !== false && r.effectiveFrom <= ctx.at && (r.scope === "global" || r.targetId === target[r.scope]))
    .sort((a, b) => RANK[a.scope] - RANK[b.scope] || b.effectiveFrom.localeCompare(a.effectiveFrom));
  const r = candidates[0];
  if (!r) return { ruleId: null, scope: "default", ratePercent: DEFAULT_COMMISSION_PERCENT, fixedPerSeat: 0 };
  return { ruleId: r.id, scope: r.scope, ratePercent: r.ratePercent, fixedPerSeat: r.fixedPerSeat ?? 0 };
}

/** Commission (centimes) sur une base payée en ligne ; jamais plus que la base, jamais négative. */
export function commissionAmount(base: number, seats: number, c: Pick<CommissionSnapshot, "ratePercent" | "fixedPerSeat">): number {
  if (base <= 0) return 0;
  const raw = Math.round((base * c.ratePercent) / 100) + Math.max(0, c.fixedPerSeat) * Math.max(0, seats);
  return Math.min(base, Math.max(0, raw));
}

/**
 * Part de la commission rendue quand une partie du paiement est remboursée : proportionnelle au montant remboursé
 * (la commission ne porte que sur ce que l'organisateur garde). Arrondi pour que la somme des écritures retombe
 * exactement sur la commission d'origine en cas de remboursement total.
 */
export function commissionRefund(base: number, commission: number, refunded: number): number {
  if (base <= 0 || refunded <= 0) return 0;
  if (refunded >= base) return commission;
  return Math.round((commission * refunded) / base);
}

/** Délai avant qu'une réservation puisse être reversée : la date de l'activité doit être passée (jours). */
export const PAYOUT_DELAY_DAYS = 1;
/** Reversement au plus tard 15 jours après l'activité (contrat organisateur, art. 6). */
export const PAYOUT_DEADLINE_DAYS = 15;

export const commissionRuleInputSchema = z
  .object({
    scope: z.enum(COMMISSION_SCOPES),
    targetId: z.string().trim().max(60).optional().or(z.literal("")),
    ratePercent: z.coerce.number().min(0, "min0").max(100, "max100"),
    fixedPerSeatDh: z.coerce.number().min(0, "min0").max(10_000, "tooMany").optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalidDate"),
    note: z.string().trim().max(200, "tooLong").optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.scope !== "global" && !v.targetId) ctx.addIssue({ code: "custom", path: ["targetId"], message: "required" });
    if (v.scope === "category" && v.targetId && !CATEGORY_ID_PATTERN.test(v.targetId)) ctx.addIssue({ code: "custom", path: ["targetId"], message: "required" });
  });
export type CommissionRuleInput = z.input<typeof commissionRuleInputSchema>;

export const COMMISSION_SCOPE_LABELS: Record<CommissionScope, string> = {
  global: "Toutes les activités",
  category: "Une catégorie",
  organizer: "Un organisateur",
  experience: "Une activité",
};

/** Écriture du registre des commissions (commissionLedger). */
export type LedgerKind = "sale" | "refund";
export type LedgerEntry = {
  id: string;
  kind: LedgerKind;
  organizerId: string;
  reservationId: string;
  experienceId: string;
  sessionStartAt: string;
  /** Montants signés (négatifs pour un remboursement), en centimes. */
  gross: number;
  commission: number;
  payable: number;
  ratePercent: number;
  status: "due" | "in_payout" | "paid";
  payoutId?: string | null;
  createdAt: string;
};

/** Coordonnées de reversement de l'organisateur (RIB marocain à 24 chiffres). Jamais celles d'un client. */
export const payoutBankSchema = z.object({
  holder: z.string().trim().min(2, "required").max(120, "tooLong"),
  bankName: z.string().trim().min(2, "required").max(80, "tooLong"),
  rib: z
    .string()
    .transform((s) => s.replace(/\s+/g, ""))
    .pipe(z.string().regex(/^\d{24}$/, "rib")),
});
export type PayoutBank = z.infer<typeof payoutBankSchema>;

/** « 0011 1100 0000 1234 5678 9012 » → « •••• 9012 » (affichage). */
export function maskRib(rib: string): string {
  return `•••• ${rib.slice(-4)}`;
}
