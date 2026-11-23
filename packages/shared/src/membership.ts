import { z } from "zod";
import type { LocalizedText } from "./types";

/**
 * Carnet et Pass (docs/22, décisions 6 à 8, § 9 et § 17.I). Une seule « formule » en base (identifiant historique
 * « annual ») qui porte les offres : un carnet de 3 sorties et des pass de 1 semaine à 1 an. Pas de prélèvement
 * automatique : chaque offre se paie en une fois.
 * - Pass : la place de son titulaire est incluse (frais Wenzy offerts), accès anticipé, événements abonnés uniquement,
 *   priorité sur la liste d'attente ; 2 réservations à venir au maximum ; absences → avertissement puis suspension.
 * - Carnet : 1 crédit par place (invité compris), sans accès anticipé, valable 3 mois.
 */
export const MEMBERSHIP_PLAN_ID = "annual";
export const OFFER_KINDS = ["pass", "carnet"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

/** Pass : 2 réservations à venir au maximum couvertes par le pass (décision 8). */
export const PASS_MAX_UPCOMING = 2;
/** Absences comptées sur 90 jours ; à la 2e, pass suspendu 14 jours (décision 8). */
export const ABSENCE_WINDOW_DAYS = 90;
export const ABSENCES_BEFORE_SUSPENSION = 2;
export const SUSPENSION_DAYS = 14;

export type MembershipOffer = { id: string; kind: OfferKind; days: number; credits?: number; price: { amount: number; currency: "MAD" }; isActive: boolean; highlight?: boolean };

/** Offres validées (décision 6). Prix modifiables dans le back-office. */
export const DEFAULT_OFFERS: MembershipOffer[] = [
  { id: "carnet3", kind: "carnet", days: 90, credits: 3, price: { amount: 7000, currency: "MAD" }, isActive: true },
  { id: "pass7", kind: "pass", days: 7, price: { amount: 4900, currency: "MAD" }, isActive: true },
  { id: "pass30", kind: "pass", days: 30, price: { amount: 9900, currency: "MAD" }, isActive: true },
  { id: "pass90", kind: "pass", days: 90, price: { amount: 24900, currency: "MAD" }, isActive: true },
  { id: "pass180", kind: "pass", days: 180, price: { amount: 44900, currency: "MAD" }, isActive: true, highlight: true },
  { id: "pass365", kind: "pass", days: 365, price: { amount: 79000, currency: "MAD" }, isActive: true },
];
export const OFFER_IDS = DEFAULT_OFFERS.map((o) => o.id) as [string, ...string[]];

export type MembershipPlan = {
  id: string;
  name: LocalizedText;
  /** Offres (carnet et pass) ; absentes ou anciennes (par mois) → offres par défaut. */
  offers?: MembershipOffer[];
  benefits: LocalizedText[];
  isActive: boolean;
  /** Anciennes formules (avant docs/22) : gardés pour les anciennes fiches sans accès anticipé par événement. */
  earlyAccessHours?: number;
  price?: { amount: number; currency: "MAD" };
};

/** Pass d'une personne (memberships/{uid}) ; les anciens abonnés gardent leur durée sous forme de pass (I6). */
export type Membership = {
  uid: string;
  planId: string;
  status: "active" | "revoked";
  startAt: string;
  endAt: string;
  source: "purchase" | "gift";
  /** Garde-fous (décision 8). */
  suspendedUntil?: string | null;
  absences?: { at: string; reservationId: string }[];
};

/** Carnet d'une personne (carnets/{uid}). */
export type Carnet = { uid: string; credits: number; expiresAt: string };

/** Le pass donne-t-il ses avantages à cet instant ? (actif, dans sa période, pas suspendu) */
export function isMemberActive(m: { status: string; startAt: string | Date; endAt: string | Date; suspendedUntil?: string | Date | null } | null | undefined, now: Date = new Date()): boolean {
  if (!m || m.status !== "active") return false;
  if (m.suspendedUntil && new Date(m.suspendedUntil).getTime() > now.getTime()) return false;
  return new Date(m.startAt).getTime() <= now.getTime() && now.getTime() < new Date(m.endAt).getTime();
}

/** Pass suspendu à cet instant ? */
export function isSuspended(m: { suspendedUntil?: string | Date | null } | null | undefined, now: Date = new Date()): boolean {
  return Boolean(m?.suspendedUntil && new Date(m.suspendedUntil).getTime() > now.getTime());
}

/** Crédits utilisables du carnet (0 s'il est expiré). */
export function carnetCredits(c: { credits?: number; expiresAt?: string | Date } | null | undefined, now: Date = new Date()): number {
  if (!c || !c.expiresAt || new Date(c.expiresAt).getTime() <= now.getTime()) return 0;
  return Math.max(0, Math.floor(Number(c.credits ?? 0)));
}

/** Nouvelle période d'un pass : `days` jours à partir de maintenant, ou de la fin du pass en cours. */
export function nextPassPeriod(current: { endAt: string | Date; status: string } | null, now: Date = new Date(), days: number) {
  const currentEnd = current && current.status === "active" ? new Date(current.endAt) : null;
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return { startAt: start, endAt: new Date(start.getTime() + days * 86_400_000) };
}

/** Offres visibles (anciennes formules par mois → offres par défaut), dans l'ordre : carnet, puis pass du plus court au plus long. */
export function planOffers(plan: Pick<MembershipPlan, "offers"> | null | undefined, opts: { includeInactive?: boolean } = {}): MembershipOffer[] {
  const raw = plan?.offers?.length && plan.offers.every((o) => (OFFER_KINDS as readonly string[]).includes((o as MembershipOffer).kind)) ? plan.offers : DEFAULT_OFFERS;
  const order = new Map(DEFAULT_OFFERS.map((o, i) => [o.id, i]));
  return raw.filter((o) => opts.includeInactive || (o.isActive && o.price.amount > 0)).sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export function pickOffer(plan: Pick<MembershipPlan, "offers"> | null | undefined, offerId: string): MembershipOffer | null {
  return planOffers(plan).find((o) => o.id === offerId) ?? null;
}

/** Nom d'une offre : « Pass 6 mois », « Carnet 3 sorties ». */
export function offerLabel(o: Pick<MembershipOffer, "kind" | "days" | "credits">, locale: string = "fr"): string {
  const l = locale === "en" || locale === "ar" ? locale : "fr";
  if (o.kind === "carnet") return { fr: `Carnet ${o.credits ?? 3} sorties`, en: `${o.credits ?? 3}-outing pack`, ar: `دفتر ${o.credits ?? 3} خرجات` }[l];
  const d = o.days;
  const dur = d === 7 ? { fr: "1 semaine", en: "1 week", ar: "أسبوع" } : d === 365 ? { fr: "1 an", en: "1 year", ar: "سنة" } : { fr: `${Math.round(d / 30)} mois`, en: `${Math.round(d / 30)} month${Math.round(d / 30) > 1 ? "s" : ""}`, ar: `${Math.round(d / 30)} أشهر` };
  return { fr: `Pass ${dur.fr}`, en: `${dur.en} pass`, ar: `باس ${dur.ar}` }[l];
}

/** Repères d'une offre : prix par mois (pass d'un mois et plus) et nombre de sorties à partir duquel elle est rentable. */
export function offerEconomics(o: MembershipOffer, unitPrice: number) {
  const perMonth = o.kind === "pass" && o.days >= 30 ? Math.round(o.price.amount / (o.days / 30) / 100) * 100 : null;
  const breakEven = unitPrice > 0 ? Math.ceil(o.price.amount / unitPrice) : null;
  const saving = o.kind === "carnet" ? Math.max(0, (o.credits ?? 0) * unitPrice - o.price.amount) : 0;
  return { perMonth, breakEven, saving };
}

/**
 * Places couvertes d'une réservation (décisions 6 à 8) : la place du titulaire par le pass (sauf s'il couvre déjà
 * 2 réservations à venir), puis les autres places (ou toutes, sans pass) par les crédits du carnet si la personne
 * choisit de les utiliser.
 */
export function coverageFor(o: { seats: number; pass: boolean; passUpcoming: number; credits: number; useCarnet: boolean }): { passSeats: number; carnetSeats: number; passLimitReached: boolean } {
  const passLimitReached = o.pass && o.passUpcoming >= PASS_MAX_UPCOMING;
  const passSeats = o.pass && !passLimitReached ? 1 : 0;
  const carnetSeats = o.useCarnet ? Math.min(Math.max(0, o.seats - passSeats), o.credits) : 0;
  return { passSeats, carnetSeats, passLimitReached };
}

/** Absences récentes qui comptent (90 jours, après la dernière suspension). */
export function countedAbsences(absences: { at: string | Date }[] | undefined, now: Date = new Date(), since?: string | Date | null): number {
  const from = Math.max(now.getTime() - ABSENCE_WINDOW_DAYS * 86_400_000, since ? new Date(since).getTime() : 0);
  return (absences ?? []).filter((a) => new Date(a.at).getTime() > from).length;
}

/** Réglages des offres saisis dans le back-office (prix en dirhams). */
export const membershipPlanInputSchema = z.object({
  nameFr: z.string().trim().min(2, "required").max(60, "tooLong"),
  nameAr: z.string().trim().max(60, "tooLong").optional().or(z.literal("")),
  benefitsFr: z.string().max(2000, "tooLong").default(""),
  benefitsAr: z.string().max(2000, "tooLong").default(""),
  isActive: z.boolean(),
  offers: z.array(z.object({ id: z.enum(OFFER_IDS), priceDh: z.coerce.number().min(0, "min0").max(100_000, "tooMany"), isActive: z.boolean() })).min(1).max(DEFAULT_OFFERS.length),
  highlightId: z.enum(OFFER_IDS).optional(),
}).refine((v) => !v.isActive || v.offers.some((o) => o.isActive && o.priceDh >= 1), { message: "noOffer", path: ["offers"] });
export type MembershipPlanInput = z.infer<typeof membershipPlanInputSchema>;

/** Offrir un pass (jours) ou des crédits (équipe). */
export const grantInputSchema = z.object({
  uid: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  days: z.number().int().min(0).max(730).default(0),
  credits: z.number().int().min(0).max(20).default(0),
  reason: z.string().trim().min(2).max(200),
}).refine((v) => v.days > 0 || v.credits > 0, { message: "required", path: ["days"] });

/** Audit 23/11 : annuler soi-même une place incluse dans le pass à moins de 24 h du début compte comme une absence. */
export const PASS_LATE_CANCEL_HOURS = 24;
export function isLatePassCancel(passSeats: number, startAt: Date, now: Date = new Date()): boolean {
  return passSeats > 0 && startAt.getTime() - now.getTime() < PASS_LATE_CANCEL_HOURS * 3_600_000;
}

/**
 * Audit 23/11 — droit de rétractation (CGV § 6) : un carnet ou un pass se rembourse intégralement dans les 7 jours
 * suivant l'achat s'il n'a pas été utilisé (pass : aucune place couverte depuis l'achat ; carnet : tous ses crédits
 * encore disponibles). Le serveur refait toujours ce calcul.
 */
export const MEMBERSHIP_WITHDRAWAL_DAYS = 7;
export type WithdrawalRefusal = "too_late" | "already_used" | "already_withdrawn" | "not_withdrawable";
export function withdrawalRefusal(o: {
  status: string; kind: OfferKind; purchasedAt: Date; withdrawnAt?: Date | null;
  passSeatsUsedSince: number; creditsBought: number; creditsLeft: number;
}, now: Date = new Date()): WithdrawalRefusal | null {
  if (o.withdrawnAt) return "already_withdrawn";
  if (!["succeeded"].includes(o.status)) return "not_withdrawable";
  if (now.getTime() > o.purchasedAt.getTime() + MEMBERSHIP_WITHDRAWAL_DAYS * 86_400_000) return "too_late";
  if (o.kind === "pass" ? o.passSeatsUsedSince > 0 : o.creditsLeft < o.creditsBought) return "already_used";
  return null;
}
