import { z } from "zod";
import { bookingPreferencesSchema, promoCodeSchema, promoDiscount, serviceFeeAmount, type PromoRule, type ServiceFee } from "./promo";
import { questionnaireAnswersSchema } from "./questionnaire";
import { seatsAvailable } from "./seats";
import { MOROCCO_TIMEZONE } from "./constants";
import { zonedDateTimeToUtc, zonedParts } from "./time";
import type { BookingMode, CurrencyCode, Pricing } from "./types";

/** Durée pendant laquelle une place reste bloquée le temps du paiement (hypothèse validée : 15 min). */
export const HOLD_MINUTES = 15;

/**
 * Prix Wenzy d'une place, en centimes (docs/22, décision 1) : 35 DH tout compris (30 DH + 5 DH de frais), le même pour
 * tous les événements. Réglable par le super-admin (Paramètres → Prix Wenzy) ; tout le reste se paie sur place.
 */
export const DEFAULT_WENZY_PRICE = 3500;
/** Prix Wenzy en vigueur, lu dans `settings/booking.wenzyPrice` (centimes) ; 35 DH à défaut. */
export function wenzyPriceOf(settings: { wenzyPrice?: unknown } | null | undefined): number {
  const v = Number(settings?.wenzyPrice);
  return Number.isInteger(v) && v >= 0 && v <= 100_000 ? v : DEFAULT_WENZY_PRICE;
}
export const wenzyPriceInputSchema = z.object({ priceDh: z.coerce.number().min(0, "min0").max(1000, "tooMany") });

/** Nombre maximal de places dans une même réservation, quel que soit le réglage de l'expérience. */
export const MAX_SEATS_PER_BOOKING = 20;

/**
 * Fermeture des réservations avant le début (docs/08 §4) : 12 h pour les dîners, dont les tables
 * doivent être composées à l'avance ; 2 h pour les autres formats.
 */
export function bookingCloseHours(mode: BookingMode): number {
  return mode === "social_dinner" ? 12 : 2;
}

export function bookingClosesAt(startAt: Date, mode: BookingMode): Date {
  const closes = new Date(startAt.getTime() - bookingCloseHours(mode) * 3_600_000);
  if (mode !== "social_dinner") return closes;
  // docs/22, décision 42 : début avant 14 h → fermeture au plus tard à 18 h la veille (on appelle les lieux de jour).
  const z = zonedParts(startAt, MOROCCO_TIMEZONE);
  if (z.hour >= 14) return closes;
  const eve = localOnDayBefore(startAt, 18);
  return eve.getTime() < closes.getTime() ? eve : closes;
}

/** `hour` h (heure du Maroc) la veille du jour de `instant`. */
export function localOnDayBefore(instant: Date, hour: number): Date {
  const z = zonedParts(instant, MOROCCO_TIMEZONE);
  const d = new Date(Date.UTC(z.year, z.month - 1, z.day - 1));
  return zonedDateTimeToUtc({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour, minute: 0 }, MOROCCO_TIMEZONE);
}

/** Demande de réservation envoyée par le navigateur ; tout le reste (prix, places) est décidé par le serveur. */
export const reservationRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  seats: z.number().int().min(1).max(MAX_SEATS_PER_BOOKING),
  /** Code promo saisi (facultatif) : validé par le serveur. */
  promoCode: promoCodeSchema.optional(),
  /** Régime, allergies, langues de table (5g, facultatif). */
  preferences: bookingPreferencesSchema.optional(),
  /** 18c : conditions de participation aux activités physiques acceptées (exigé si l'expérience le demande). */
  physicalTermsAccepted: z.boolean().optional(),
  /** Réponses au questionnaire de l'expérience, données AVANT le paiement (docs/22) ; vérifiées par le serveur. */
  answers: questionnaireAnswersSchema.optional(),
  /** docs/22 § 17.I : régler les places avec les crédits du carnet. */
  useCarnet: z.boolean().optional(),
});
export type ReservationRequest = z.infer<typeof reservationRequestSchema>;

/**
 * Place libérée proposée à la première personne de la liste d'attente : elle lui est réservée pendant
 * ce délai (hypothèse : 4 h, jamais au-delà de la fermeture des réservations), puis passe à la suivante.
 */
export const WAITLIST_OFFER_HOURS = 4;

/** Délai pour payer après l'acceptation d'une demande de participation. */
export const ACCEPTED_HOLD_HOURS = 24;
export const REQUEST_MESSAGE_MAX = 500;

/**
 * Compte Instagram facultatif : « @pseudo », « pseudo » ou lien instagram.com/pseudo.
 * Renvoie le pseudo seul (sans @), ou null s'il est invalide.
 */
export function normalizeInstagram(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|instagr\.am)\/([A-Za-z0-9._]{1,30})\/?(?:\?.*)?$/i) ?? v.match(/^@?([A-Za-z0-9._]{1,30})$/);
  return m ? m[1]!.toLowerCase() : null;
}

/** Demande de participation envoyée par le navigateur. */
export const bookingRequestSchema = z.object({
  sessionId: reservationRequestSchema.shape.sessionId,
  seats: reservationRequestSchema.shape.seats,
  message: z.string().trim().max(REQUEST_MESSAGE_MAX, "tooLong").default(""),
  preferences: bookingPreferencesSchema.optional(),
  instagram: z
    .string()
    .trim()
    .max(120)
    .default("")
    .refine((v) => v === "" || normalizeInstagram(v) !== null, "invalidInstagram"),
  physicalTermsAccepted: z.boolean().optional(),
  /** Réponses au questionnaire, données avec la demande (avant tout paiement, docs/22). */
  answers: questionnaireAnswersSchema.optional(),
});
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;

/**
 * Prix d'une réservation, en centimes. `memberUnitAmount` : prix membre par place si la personne est
 * abonnée (la différence apparaît en « réduction membre »). Codes promo et frais : étape 5d.
 */
/**
 * Prix d'une réservation : places au prix public − remise membre − code promo + frais de service.
 * Le code promo s'applique après le prix membre ; les frais ne s'ajoutent qu'à une réservation payante.
 */
export function computePricing(
  unitAmount: number,
  seats: number,
  currency: CurrencyCode,
  opts: { memberUnitAmount?: number; promo?: PromoRule & { code: string }; serviceFee?: ServiceFee; coverage?: { passSeats: number; carnetSeats: number; cap: number } } = {},
): Pricing {
  const subtotal = unitAmount * seats;
  const memberUnit = opts.memberUnitAmount;
  // docs/22 § 17.I : places incluses dans le pass ou réglées avec le carnet (au plus le prix Wenzy par place).
  const cov = opts.coverage && opts.coverage.passSeats + opts.coverage.carnetSeats > 0 ? opts.coverage : null;
  const memberDiscount = cov
    ? Math.min(seats, cov.passSeats + cov.carnetSeats) * Math.min(unitAmount, cov.cap)
    : memberUnit != null && memberUnit < unitAmount ? (unitAmount - memberUnit) * seats : 0;
  const afterMember = subtotal - memberDiscount;
  const discount = opts.promo ? promoDiscount(opts.promo, afterMember) : 0;
  const net = afterMember - discount;
  const fees = net > 0 && opts.serviceFee ? serviceFeeAmount(opts.serviceFee, net, seats) : 0;
  return {
    unitAmount, seats, subtotal, memberDiscount, discount, ...(opts.promo && discount > 0 ? { promoCode: opts.promo.code } : {}), fees, total: net + fees, currency,
    ...(cov ? { coverage: { passSeats: cov.passSeats, carnetSeats: Math.min(cov.carnetSeats, seats - Math.min(seats, cov.passSeats)) } } : {}),
  };
}

export type BookingRefusal = "not_open" | "closed" | "full" | "not_enough_seats" | "too_many_seats";

/**
 * Peut-on réserver `seats` places sur cette session à `now` ? Utilisé à l'identique par le serveur
 * (dans la transaction, qui fait foi) et par l'interface (pour afficher le bon message).
 */
export function bookingRefusal(
  session: { status: string; startAt: Date; capacity: number; seatsConfirmed: number; seatsHeld: number },
  experience: { bookingMode: BookingMode; maxSeatsPerBooking?: number },
  seats: number,
  now: Date = new Date(),
): BookingRefusal | null {
  if (session.status !== "published" && session.status !== "full") return "not_open";
  if (now.getTime() >= bookingClosesAt(session.startAt, experience.bookingMode).getTime()) return "closed";
  const available = seatsAvailable(session);
  if (available === 0) return "full";
  if (seats > maxSeatsFor(experience)) return "too_many_seats";
  if (seats > available) return "not_enough_seats";
  return null;
}

export function maxSeatsFor(experience: { maxSeatsPerBooking?: number }): number {
  return Math.min(Math.max(1, experience.maxSeatsPerBooking ?? 1), MAX_SEATS_PER_BOOKING);
}

/** Avis : délai pour noter après la fin de l'expérience (hypothèse : 60 jours). */
export const REVIEW_WINDOW_DAYS = 60;
export const REVIEW_COMMENT_MAX = 1000;

export const reviewInputSchema = z.object({
  reservationId: reservationRequestSchema.shape.sessionId,
  rating: z.number().int().min(1, "rating").max(5, "rating"),
  comment: z.string().trim().max(REVIEW_COMMENT_MAX, "tooLong").default(""),
  /** Étape 24 : photo facultative déjà envoyée dans review-uploads/{uid}/… (vérifiée par le serveur). */
  photoPath: z.string().max(300).regex(/^review-uploads\/[A-Za-z0-9_-]{1,128}\/[\w.-]{1,120}$/, "invalidImage").optional().or(z.literal("")),
  /** Notes détaillées facultatives (page Avis : « Chaque question que nous posons »). */
  details: z.object({ group: z.number().int().min(1).max(5).optional(), organisation: z.number().int().min(1).max(5).optional(), venue: z.number().int().min(1).max(5).optional() }).optional(),
  /** « Reviendriez-vous ? » (facultatif). */
  comeAgain: z.boolean().optional(),
});

/** Questions détaillées d'un avis (toutes facultatives). */
export const REVIEW_DETAIL_KEYS = ["group", "organisation", "venue"] as const;
export type ReviewDetailKey = (typeof REVIEW_DETAIL_KEYS)[number];

/** Peut-on laisser un avis sur cette réservation à `now` ? (présent·e, ou confirmé·e et expérience terminée) */
export function canReview(r: { status: string; sessionSnapshot: { endAt: string } }, now: Date = new Date()): boolean {
  const end = new Date(r.sessionSnapshot.endAt).getTime();
  if (now.getTime() > end + REVIEW_WINDOW_DAYS * 86_400_000) return false;
  if (r.status === "attended") return true;
  return r.status === "confirmed" && now.getTime() >= end;
}

/**
 * Arrivée autonome (docs/16, phase 7) : pas d'hôte ni d'hôtesse ; chaque participant indique lui-même son arrivée,
 * de 30 min avant le début à 1 h après. Il voit alors son groupe pour le retrouver.
 */
export const SELF_CHECKIN_BEFORE_MIN = 30;
export const SELF_CHECKIN_AFTER_MIN = 60;
export function selfCheckInState(startAt: string, now: Date = new Date()): "early" | "open" | "closed" {
  const start = new Date(startAt).getTime();
  if (now.getTime() < start - SELF_CHECKIN_BEFORE_MIN * 60_000) return "early";
  if (now.getTime() > start + SELF_CHECKIN_AFTER_MIN * 60_000) return "closed";
  return "open";
}

/**
 * Ce qu'il est utile de demander pour bien recevoir chacun (docs/16) : régime et allergies seulement quand on
 * mange ou boit (univers « Dîners », dîner composé, ou option « plats servis »), langue du groupe seulement pour les
 * expériences en groupe composé. Rien du tout pour un atelier ou une course en accès libre.
 */
export function welcomeNeeds(e: { categoryId: string; bookingMode: string; foodServed?: boolean }): { food: boolean; languages: boolean } {
  return {
    food: e.foodServed === true || e.categoryId === "eat" || e.bookingMode === "social_dinner",
    languages: e.bookingMode === "social_dinner" || e.bookingMode === "group",
  };
}

/**
 * Billet à QR code seulement s'il y a quelqu'un pour le scanner (docs/22) : une hôtesse ou l'équipe sur place
 * (option « hôtesse » de l'expérience), ou l'organisateur de l'activité, présent pour pointer ses participants.
 * Une part à régler sur place ne suffit plus : le check-in seul (« Je suis arrivé·e ») est la règle.
 */
export const needsTicket = (e: { onSiteHost?: boolean; organizerId?: string | null } | null | undefined, r?: { organizerId?: string | null }) =>
  e?.onSiteHost === true || Boolean(r?.organizerId ?? e?.organizerId);

/** Nom public d'un avis : prénom + initiale du nom (« Sara B. »). */
export function publicNameOf(firstName?: string, lastName?: string): string {
  const f = (firstName ?? "").trim() || "Membre";
  const l = (lastName ?? "").trim();
  return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
}
