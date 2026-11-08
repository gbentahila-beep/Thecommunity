"use client";

import type { BookingPreferences, Pricing } from "@thecommunity/shared";
import { httpsCallable } from "firebase/functions";
import { firebase } from "@/lib/firebase/client";

/** Raisons de refus renvoyées par le serveur (details.reason), traduites dans booking.errors. */
export const BOOKING_ERRORS = [
  "email_not_verified",
  "profile_incomplete",
  "suspended",
  "not_open",
  "closed",
  "full",
  "not_enough_seats",
  "too_many_seats",
  "already_booked",
  "payments_unavailable",
  "hold_expired",
  "not_payable",
  "already_paid",
  "already_processed",
  "approval_required",
  "members_only",
  "members_early_access",
  "busy",
  "signin",
  "generic",
] as const;
export type BookingError = (typeof BOOKING_ERRORS)[number];

export function bookingErrorOf(err: unknown): BookingError {
  const e = err as { code?: string; details?: { reason?: string } };
  const reason = e.details?.reason;
  if (reason && (BOOKING_ERRORS as readonly string[]).includes(reason)) return reason as BookingError;
  if (e.code === "functions/unauthenticated") return "signin";
  if (e.code === "functions/aborted" || e.code === "functions/resource-exhausted") return "busy";
  return "generic";
}

/**
 * Jeton à jour avant d'appeler le serveur : l'état « e-mail confirmé » est figé dans le jeton
 * au moment de la connexion ; s'il vient de changer, on en redemande un.
 */
async function freshUser() {
  const user = firebase().auth.currentUser;
  if (!user) throw { code: "functions/unauthenticated" };
  if (!user.emailVerified) {
    await user.reload();
    if (user.emailVerified) await user.getIdToken(true);
  }
  return user;
}

export async function createReservation(sessionId: string, seats: number, opts: { promoCode?: string; preferences?: BookingPreferences } = {}) {
  await freshUser();
  // Champs absents plutôt que vides : le SDK transmettrait `undefined` comme `null`, refusé par le serveur.
  const extra = Object.fromEntries(Object.entries(opts).filter(([, v]) => v !== undefined && v !== null));
  const res = await httpsCallable(firebase().functions, "createReservation")({ sessionId, seats, ...extra });
  return res.data as { reservationId: string; status: "pending_payment" | "confirmed"; resumed: boolean; total: number };
}

/** Prix exact calculé par le serveur (prix membre, code promo, frais de service), avant de réserver. */
export async function previewPricing(sessionId: string, seats: number, promoCode?: string) {
  await freshUser();
  const res = await httpsCallable(firebase().functions, "previewPricing")({ sessionId, seats, ...(promoCode ? { promoCode } : {}) });
  return (res.data as { pricing: Pricing }).pricing;
}

/** Raison d'un refus de code promo (ou null si ce n'en est pas un). */
export function promoErrorOf(err: unknown): string | null {
  const reason = (err as { details?: { reason?: string; issues?: { path: string }[] } }).details;
  if (reason?.reason?.startsWith("promo_")) return reason.reason;
  if (reason?.issues?.some((i) => i.path === "promoCode")) return "promoFormat";
  return null;
}

export async function startCheckout(reservationId: string) {
  await freshUser();
  const res = await httpsCallable(firebase().functions, "startCheckout")({ reservationId });
  return res.data as { paymentId: string; redirectUrl: string };
}

export async function completeTestPayment(paymentId: string, outcome: "succeeded" | "failed") {
  await freshUser();
  const res = await httpsCallable(firebase().functions, "sandboxCompletePayment")({ paymentId, outcome });
  return res.data as { outcome: string; reservationId: string };
}

/** Attend que le SDK ait restauré la session du navigateur (sinon currentUser est encore vide). */
export async function authReady() {
  await firebase().auth.authStateReady();
}
