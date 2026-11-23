import { carnetCredits, coverageFor, isMemberActive, MEMBERSHIP_PLAN_ID } from "@thecommunity/shared";
import { Timestamp, type DocumentData, type Transaction } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import { refuse } from "../reservations/refuse";

export const planRef = () => db.doc(`membershipPlans/${MEMBERSHIP_PLAN_ID}`);
export const membershipRef = (uid: string) => db.doc(`memberships/${uid}`);
export const carnetRef = (uid: string) => db.doc(`carnets/${uid}`);

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : v ? new Date(String(v)) : null);

/** Pass utilisable à cet instant ? (memberships/{uid} : actif, dans sa période, pas suspendu) */
export function memberFromDoc(d: DocumentData | undefined, now = new Date()): boolean {
  if (!d) return false;
  return isMemberActive({ status: d.status, startAt: toDate(d.startAt) ?? new Date(0), endAt: toDate(d.endAt) ?? new Date(0), suspendedUntil: toDate(d.suspendedUntil) }, now);
}

/** Crédits utilisables du carnet (carnets/{uid}). */
export function creditsFromDoc(d: DocumentData | undefined, now = new Date()): number {
  return carnetCredits(d ? { credits: d.credits, expiresAt: toDate(d.expiresAt) ?? undefined } : null, now);
}

/** Réservations à venir déjà couvertes par le pass (garde-fou : 2 au maximum). */
export async function passUpcoming(uid: string, now: number, tx?: Transaction): Promise<number> {
  const q = db.collection("reservations").where("userId", "==", uid).where("status", "==", "confirmed");
  const snap = tx ? await tx.get(q) : await q.get();
  return snap.docs.filter((d) => Number(d.get("pricing.coverage.passSeats") ?? 0) > 0 && (d.get("sessionSnapshot.startAt") as Timestamp | undefined)?.toMillis()! > now).length;
}

/**
 * Règles du Carnet et du Pass appliquées à une réservation (lues dans la transaction, docs/22 § 17.I) :
 * événement abonnés uniquement et accès anticipé (pass seulement), places couvertes par le pass ou le carnet.
 */
export function membershipTerms(o: {
  plan: DocumentData | undefined;
  membership: DocumentData | undefined;
  carnet?: DocumentData | undefined;
  s: DocumentData;
  e: DocumentData;
  now: number;
  seats?: number;
  passUpcoming?: number;
  useCarnet?: boolean;
  wenzyPrice?: number;
  /** Acceptation d'une demande par l'équipe : pas de contrôle d'accès anticipé. */
  byTeam?: boolean;
}): { member: boolean; credits: number; coverage?: { passSeats: number; carnetSeats: number; cap: number }; passLimitReached: boolean } {
  const member = memberFromDoc(o.membership, new Date(o.now));
  if (o.e.membersOnly === true && !member) refuse("members_only", "Expérience réservée aux abonnés.");
  // docs/22, décision 9 : l'accès anticipé se règle par événement (X jours) ; à défaut (anciennes fiches), réglage de la formule.
  const early = typeof o.e.earlyAccessDays === "number" ? o.e.earlyAccessDays * 24 : o.plan?.isActive === true ? Number(o.plan.earlyAccessHours ?? 0) : 0;
  const created = o.s.createdAt instanceof Timestamp ? o.s.createdAt.toMillis() : null;
  if (!o.byTeam && !member && early > 0 && created !== null && o.now < created + early * 3_600_000) {
    refuse("members_early_access", "Nouvelle date en accès anticipé pour les abonnés.");
  }
  const credits = creditsFromDoc(o.carnet, new Date(o.now));
  const cov = coverageFor({ seats: o.seats ?? 1, pass: member, passUpcoming: o.passUpcoming ?? 0, credits, useCarnet: o.useCarnet === true });
  // Le pass et le carnet couvrent les frais Wenzy (décision 7), jamais plus que le prix Wenzy par place.
  const cap = Math.min(Number(o.s.price?.amount ?? 0), o.wenzyPrice ?? Number(o.s.price?.amount ?? 0));
  return { member, credits, passLimitReached: cov.passLimitReached, ...(cov.passSeats + cov.carnetSeats > 0 && cap > 0 ? { coverage: { passSeats: cov.passSeats, carnetSeats: cov.carnetSeats, cap } } : {}) };
}
