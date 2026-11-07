import { isMemberActive, MEMBERSHIP_PLAN_ID, memberUnitPrice } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import { refuse } from "../reservations/refuse";

export const planRef = () => db.doc(`membershipPlans/${MEMBERSHIP_PLAN_ID}`);
export const membershipRef = (uid: string) => db.doc(`memberships/${uid}`);

/** Membre abonné à cet instant ? (document memberships/{uid}) */
export function memberFromDoc(d: DocumentData | undefined, now = new Date()): boolean {
  if (!d) return false;
  const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : new Date(String(v)));
  return isMemberActive({ status: d.status, startAt: toDate(d.startAt), endAt: toDate(d.endAt) }, now);
}

/**
 * Règles d'abonnement appliquées à une réservation (lues dans la transaction) :
 * expérience réservée aux membres, accès anticipé aux nouvelles dates, prix membre.
 * Les membres existants gardent leurs avantages même si la formule n'est plus proposée à la vente.
 */
export function membershipTerms(o: {
  plan: DocumentData | undefined;
  membership: DocumentData | undefined;
  s: DocumentData;
  e: DocumentData;
  now: number;
  /** Acceptation d'une demande par l'équipe : pas de contrôle d'accès anticipé. */
  byTeam?: boolean;
}): { member: boolean; memberUnitAmount?: number } {
  const member = memberFromDoc(o.membership, new Date(o.now));
  if (o.e.membersOnly === true && !member) refuse("members_only", "Expérience réservée aux membres.");
  const early = o.plan?.isActive === true ? Number(o.plan.earlyAccessHours ?? 0) : 0;
  const created = o.s.createdAt instanceof Timestamp ? o.s.createdAt.toMillis() : null;
  if (!o.byTeam && !member && early > 0 && created !== null && o.now < created + early * 3_600_000) {
    refuse("members_early_access", "Nouvelle date en accès anticipé pour les membres.");
  }
  if (!member) return { member };
  const memberUnitAmount = memberUnitPrice(o.s.price.amount, { discountPercent: Number(o.plan?.discountPercent ?? 0) }, o.e.memberPrice?.amount ?? null);
  return { member, memberUnitAmount };
}
