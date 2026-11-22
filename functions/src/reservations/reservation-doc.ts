import { computePricing, initialPartnerStatus, isSecretVenue, publicExperience, NO_SERVICE_FEE, onSiteAmount, partnerSnapshotOf, pricingOf, type BookingPreferences, type PromoRule, type ServiceFee } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { FieldValue } from "../lib/admin";
import { commissionSnapshot } from "../commissions/ledger";
import type { CancellationPolicy, CommissionRule } from "@thecommunity/shared";

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
  /** Prix membre par place (anciennes formules) ; absent = prix public. */
  memberUnitAmount?: number;
  /** docs/22 § 17.I : places incluses dans le pass ou réglées avec le carnet. */
  coverage?: { passSeats: number; carnetSeats: number; cap: number };
  /** Code promo validé (5f) et frais de service en vigueur. */
  promo?: PromoRule & { code: string };
  serviceFee?: ServiceFee;
  /** Régime, allergies, langues (5g). */
  preferences?: BookingPreferences;
  extra?: Record<string, unknown>;
  /** Étape 21 : règles de commission (activités des organisateurs). */
  commissionRules?: CommissionRule[];
  /** Étape 22 : politiques d'annulation (copiée sur la réservation). */
  policies?: CancellationPolicy[];
}) {
  const { s, e, uid, sessionId, seats } = o;
  const pricing = computePricing(s.price.amount, seats, s.price.currency, {
    memberUnitAmount: o.memberUnitAmount,
    coverage: o.coverage,
    promo: o.promo,
    serviceFee: o.serviceFee ?? NO_SERVICE_FEE,
  });
  const free = pricing.total === 0;
  // Étape 11 : la part partenaire (sur place) est copiée telle qu'elle est au moment de la réservation.
  // Lieu secret (docs/22) : le nom du partenaire (souvent le restaurant) n'est pas copié avant la révélation.
  const twoPart = pricingOf(publicExperience(e as never) as never);
  const snap = s.experienceSnapshot ?? {};
  const venue = e.venue?.revealPolicy === "immediate" ? { name: e.venue.name ?? "", address: e.venue.address ?? "" } : null;
  const doc = {
    userId: uid,
    sessionId,
    experienceId: s.experienceId,
    // Étape 19 : organisateur de l'activité (null = Wenzy), pour son espace et les règles d'accès.
    organizerId: (e.organizerId as string | undefined) ?? (s.organizerId as string | undefined) ?? null,
    // Étape 22 : politique d'annulation figée au moment de la réservation.
    ...(o.policies ? { cancellationPolicy: (() => { const p = o.policies.find((x) => x.id === e.cancellationPolicyId) ?? o.policies[0]; return p ? { id: p.id, label: p.label, rules: p.rules } : null; })() } : {}),
    // Étape 21 : commission figée au moment de la réservation (base : payé en ligne, hors frais de service).
    ...(o.commissionRules && e.organizerId ? { commission: commissionSnapshot(o.commissionRules, e, s.experienceId, pricing.total - pricing.fees, seats) } : {}),
    cityId: s.cityId,
    categoryId: s.categoryId,
    seats,
    status: free ? "confirmed" : "pending_payment",
    holdExpiresAt: Timestamp.fromMillis(o.holdUntilMs),
    pricing,
    partnerSnapshot: partnerSnapshotOf(twoPart),
    onSiteAmount: onSiteAmount(twoPart, seats),
    partnerPaymentStatus: initialPartnerStatus(twoPart),
    cancellationPolicyId: e.cancellationPolicyId ?? "standard-48h",
    sessionSnapshot: {
      title: snap.title ?? e.title,
      slug: snap.slug ?? e.slug,
      startAt: s.startAt,
      endAt: s.endAt,
      district: isSecretVenue(e) ? "" : (snap.district ?? e.district ?? ""),
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
