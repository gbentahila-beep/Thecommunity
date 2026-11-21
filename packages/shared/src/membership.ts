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

/** Durées proposées (en mois). Chaque durée se paie en une fois, sans renouvellement automatique. */
export const MEMBERSHIP_DURATIONS = [1, 3, 6, 12] as const;
export type MembershipDuration = (typeof MEMBERSHIP_DURATIONS)[number];

/** Une offre de la formule : une durée, son prix, sa visibilité. `highlight` = offre mise en avant (« Recommandée »). */
export type MembershipOffer = { id: string; months: MembershipDuration; price: { amount: number; currency: "MAD" }; isActive: boolean; highlight?: boolean };

export type MembershipPlan = {
  id: string;
  name: LocalizedText;
  /** Prix de l'offre 12 mois (compatibilité ; les prix font foi dans `offers`). */
  price: { amount: number; currency: "MAD" };
  /** Offres par durée ; absentes sur les anciennes formules (= une seule offre de 12 mois au prix `price`). */
  offers?: MembershipOffer[];
  /** Les membres ne paient pas les frais de service. */
  waiveServiceFee?: boolean;
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

/** Fin d'une nouvelle période : `months` mois (12 par défaut) à partir de maintenant, ou de l'échéance en cours si on renouvelle en avance. */
export function nextMembershipPeriod(current: { endAt: string | Date; status: string } | null, now: Date = new Date(), months: number = MEMBERSHIP_MONTHS) {
  const currentEnd = current && current.status === "active" ? new Date(current.endAt) : null;
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  return { startAt: start, endAt: end };
}

/** Offres visibles, de la plus courte à la plus longue (ancienne formule : une offre de 12 mois). */
export function planOffers(plan: Pick<MembershipPlan, "price" | "offers">): MembershipOffer[] {
  const list = plan.offers?.length ? plan.offers : [{ id: "12m", months: 12 as const, price: plan.price, isActive: true, highlight: true }];
  return list.filter((o) => o.isActive && o.price.amount > 0).sort((a, b) => a.months - b.months);
}

/** Offre choisie (ou celle mise en avant, sinon la plus longue). */
export function pickOffer(plan: Pick<MembershipPlan, "price" | "offers">, offerId?: string | null): MembershipOffer | null {
  const offers = planOffers(plan);
  if (offerId) return offers.find((o) => o.id === offerId) ?? null;
  return offers.find((o) => o.highlight) ?? offers[offers.length - 1] ?? null;
}

/** Prix par mois (centimes, arrondi au dirham) et économie par rapport à l'offre la plus courte payée chaque mois. */
export function offerEconomics(offer: MembershipOffer, offers: MembershipOffer[]) {
  const perMonth = Math.round(offer.price.amount / offer.months / 100) * 100;
  const base = offers[0];
  const reference = base && base.months < offer.months ? Math.round((base.price.amount / base.months) * offer.months) : offer.price.amount;
  const saving = Math.max(0, reference - offer.price.amount);
  return { perMonth, reference, saving, savingPercent: reference > 0 ? Math.round((saving / reference) * 100) : 0 };
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
  waiveServiceFee: z.boolean().default(false),
  /** Prix par durée (DH) ; 0 ou vide = durée non proposée. Au moins une durée proposée si la formule est active. */
  offers: z
    .array(z.object({ months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]), priceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany"), isActive: z.boolean() }))
    .max(4)
    .default([]),
  highlightMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]).optional(),
}).refine((v) => !v.isActive || v.offers.length === 0 || v.offers.some((o) => o.isActive && o.priceDh >= 1), { message: "noOffer", path: ["offers"] });
export type MembershipPlanInput = z.infer<typeof membershipPlanInputSchema>;
