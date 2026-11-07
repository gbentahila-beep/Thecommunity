import { z } from "zod";
import { seatsAvailable } from "./seats";
import type { BookingMode, CurrencyCode, Pricing } from "./types";

/** Durée pendant laquelle une place reste bloquée le temps du paiement (hypothèse validée : 15 min). */
export const HOLD_MINUTES = 15;

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
  return new Date(startAt.getTime() - bookingCloseHours(mode) * 3_600_000);
}

/** Demande de réservation envoyée par le navigateur ; tout le reste (prix, places) est décidé par le serveur. */
export const reservationRequestSchema = z.object({
  sessionId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  seats: z.number().int().min(1).max(MAX_SEATS_PER_BOOKING),
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
  instagram: z
    .string()
    .trim()
    .max(120)
    .default("")
    .refine((v) => v === "" || normalizeInstagram(v) !== null, "invalidInstagram"),
});
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;

/** Prix d'une réservation, en centimes. Codes promo et frais : phase 5. */
export function computePricing(unitAmount: number, seats: number, currency: CurrencyCode): Pricing {
  const subtotal = unitAmount * seats;
  const discount = 0;
  const fees = 0;
  return { unitAmount, seats, subtotal, discount, fees, total: subtotal - discount + fees, currency };
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
});

/** Peut-on laisser un avis sur cette réservation à `now` ? (présent·e, ou confirmé·e et expérience terminée) */
export function canReview(r: { status: string; sessionSnapshot: { endAt: string } }, now: Date = new Date()): boolean {
  const end = new Date(r.sessionSnapshot.endAt).getTime();
  if (now.getTime() > end + REVIEW_WINDOW_DAYS * 86_400_000) return false;
  if (r.status === "attended") return true;
  return r.status === "confirmed" && now.getTime() >= end;
}

/** Nom public d'un avis : prénom + initiale du nom (« Sara B. »). */
export function publicNameOf(firstName?: string, lastName?: string): string {
  const f = (firstName ?? "").trim() || "Membre";
  const l = (lastName ?? "").trim();
  return l ? `${f} ${l.charAt(0).toUpperCase()}.` : f;
}
