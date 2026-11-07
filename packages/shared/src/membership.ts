import { z } from "zod";
import type { LocalizedText } from "./types";

/**
 * Abonnement annuel (étape 5b). Une formule au lancement (identifiant « annual »), réglée par l'équipe :
 * prix annuel, réduction par défaut sur les expériences, accès anticipé aux nouvelles dates, avantages.
 * Pas de prélèvement automatique : 12 mois, puis renouvellement par la personne (rappel avant l'échéance).
 */
export const MEMBERSHIP_PLAN_ID = "annual";
export const MEMBERSHIP_MONTHS = 12;
/** On peut renouveler à partir de 30 jours avant l'échéance ; la nouvelle période commence à l'échéance. */
export const MEMBERSHIP_RENEW_WINDOW_DAYS = 30;

export type MembershipPlan = {
  id: string;
  name: LocalizedText;
  price: { amount: number; currency: "MAD" };
  /** Réduction par défaut sur le prix public des expériences (en %). */
  discountPercent: number;
  /** Les nouvelles dates sont réservées aux membres pendant ce nombre d'heures (0 = pas d'accès anticipé). */
  earlyAccessHours: number;
  benefits: LocalizedText[];
  isActive: boolean;
};

export type Membership = {
  uid: string;
  planId: string;
  status: "active" | "revoked";
  startAt: string;
  endAt: string;
  source: "purchase" | "gift";
};

/** La personne est-elle membre à cet instant ? */
export function isMemberActive(m: { status: string; startAt: string | Date; endAt: string | Date } | null | undefined, now: Date = new Date()): boolean {
  if (!m || m.status !== "active") return false;
  return new Date(m.startAt).getTime() <= now.getTime() && now.getTime() < new Date(m.endAt).getTime();
}

/**
 * Prix membre d'une place, en centimes : le prix membre précis de l'expérience s'il est réglé
 * (jamais au-dessus du prix public de la date), sinon le prix public moins la réduction de la formule,
 * arrondi au dirham (un prix lisible : 118 DH plutôt que 118,15 DH).
 */
export function memberUnitPrice(publicAmount: number, plan: Pick<MembershipPlan, "discountPercent"> | null, experienceMemberPrice?: number | null): number {
  if (experienceMemberPrice != null && experienceMemberPrice >= 0) return Math.min(experienceMemberPrice, publicAmount);
  if (!plan) return publicAmount;
  return Math.min(publicAmount, Math.round((publicAmount * (100 - plan.discountPercent)) / 100 / 100) * 100);
}

/** Fin d'une nouvelle période : 12 mois à partir de maintenant, ou de l'échéance en cours si on renouvelle en avance. */
export function nextMembershipPeriod(current: { endAt: string | Date; status: string } | null, now: Date = new Date()) {
  const currentEnd = current && current.status === "active" ? new Date(current.endAt) : null;
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + MEMBERSHIP_MONTHS);
  return { startAt: start, endAt: end };
}

/** Renouvellement possible ? (pas membre, ou échéance dans moins de 30 jours) */
export function canRenewMembership(current: { endAt: string | Date; status: string } | null, now: Date = new Date()): boolean {
  if (!current || current.status !== "active") return true;
  return new Date(current.endAt).getTime() - now.getTime() <= MEMBERSHIP_RENEW_WINDOW_DAYS * 86_400_000;
}

/** Réglages de la formule saisis dans le back-office (montants en dirhams). */
export const membershipPlanInputSchema = z.object({
  nameFr: z.string().trim().min(2, "required").max(60, "tooLong"),
  nameAr: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  priceDh: z.coerce.number().min(1, "min1").max(100_000, "tooMany"),
  discountPercent: z.coerce.number().int().min(0, "min0").max(90, "tooMany"),
  earlyAccessHours: z.coerce.number().int().min(0, "min0").max(720, "tooMany"),
  benefitsFr: z.string().max(2000, "tooLong").default(""),
  benefitsAr: z.string().max(2000, "tooLong").default(""),
  isActive: z.boolean(),
});
export type MembershipPlanInput = z.infer<typeof membershipPlanInputSchema>;
