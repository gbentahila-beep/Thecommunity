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
