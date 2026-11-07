import { computePricing, NO_SERVICE_FEE, type BookingPreferences, type PromoRule, type ServiceFee } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { FieldValue } from "../lib/admin";

/**
 * Document d'une nouvelle réservation, construit à partir de la session et de l'expérience lues dans la
 * transaction. Utilisé par la réservation directe, l'acceptation d'une demande et les offres de la liste d'attente.
 */
export function reservationDoc(o: {
  s: DocumentData;
  e: DocumentData;
  uid: string;
  sessionId: string;
  seats: number;
  holdUntilMs: number;
  /** Prix membre par place (abonné·e) ; absent = prix public. */
  memberUnitAmount?: number;
  /** Code promo validé (5f) et frais de service en vigueur. */
  promo?: PromoRule & { code: string };
  serviceFee?: ServiceFee;
  /** Régime, allergies, langues (5g). */
  preferences?: BookingPreferences;
  extra?: Record<string, unknown>;
}) {
  const { s, e, uid, sessionId, seats } = o;
  const pricing = computePricing(s.price.amount, seats, s.price.currency, {
    memberUnitAmount: o.memberUnitAmount,
    promo: o.promo,
    serviceFee: o.serviceFee ?? NO_SERVICE_FEE,
  });
  const free = pricing.total === 0;
  const snap = s.experienceSnapshot ?? {};
  const venue = e.venue?.revealPolicy === "immediate" ? { name: e.venue.name ?? "", address: e.venue.address ?? "" } : null;
  const doc = {
    userId: uid,
    sessionId,
    experienceId: s.experienceId,
    cityId: s.cityId,
    categoryId: s.categoryId,
    seats,
    status: free ? "confirmed" : "pending_payment",
    holdExpiresAt: Timestamp.fromMillis(o.holdUntilMs),
    pricing,
    cancellationPolicyId: e.cancellationPolicyId ?? "standard-48h",
    sessionSnapshot: {
      title: snap.title ?? e.title,
      slug: snap.slug ?? e.slug,
      startAt: s.startAt,
      endAt: s.endAt,
      district: snap.district ?? e.district ?? "",
      coverImagePath: snap.coverImagePath ?? e.images?.[0]?.path ?? "",
      categoryId: s.categoryId,
      bookingMode: e.bookingMode,
    },
    ...(free && venue ? { venue } : {}),
    ...(free ? { paidAt: FieldValue.serverTimestamp() } : {}),
    ...(o.preferences ? { preferences: preferencesDoc(o.preferences) } : {}),
    ...(o.extra ?? {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  return { doc, pricing, free };
}

/** Préférences enregistrées : l'accord de transmission au lieu est daté (donnée de santé pour les allergies). */
export function preferencesDoc(p: BookingPreferences) {
  return {
    diet: p.diet,
    allergies: p.allergies,
    languages: p.languages,
    shareWithVenue: p.consent,
    ...(p.consent ? { consentAt: Timestamp.now() } : {}),
  };
}
