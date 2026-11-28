import {
  DEFAULT_OFFERS,
  grantInputSchema,
  MEMBERSHIP_PLAN_ID,
  MEMBERSHIP_TRANSFER_DAYS,
  membershipPlanInputSchema,
  nextPassPeriod,
  offerLabel,
  pickOffer,
  type MembershipPlan,
} from "@thecommunity/shared";
import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { paymentSettings, providerFor } from "../payments/provider";
import { sendTransferInstructions } from "../payments/transfer-mail";
import { requireMemberReady } from "../reservations/create-reservation";
import { refuse } from "../reservations/refuse";
import { carnetRef, memberFromDoc, planRef } from "./state";

/** Formule active (ou null), lue dans une transaction si fournie. */
export async function activePlan(tx?: Transaction): Promise<MembershipPlan | null> {
  const snap = tx ? await tx.get(planRef()) : await planRef().get();
  const p = snap.data();
  return p && p.isActive === true ? ({ id: snap.id, ...p } as MembershipPlan) : null;
}

/** Réglages des offres par l'équipe (prix du carnet et des pass, offres proposées, offre mise en avant). Journalisé. */
export const adminSaveMembershipPlan = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = membershipPlanInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const fr = lines(v.benefitsFr);
  const ar = lines(v.benefitsAr);
  const byId = new Map(v.offers.map((o) => [o.id, o]));
  const offers = DEFAULT_OFFERS.map((d) => {
    const o = byId.get(d.id);
    const priceDh = o ? o.priceDh : d.price.amount / 100;
    return { ...d, price: { amount: Math.round(priceDh * 100), currency: "MAD" as const }, isActive: o ? o.isActive && priceDh >= 1 : d.isActive, highlight: d.id === (v.highlightId ?? "pass180") };
  });
  await planRef().set({
    name: { fr: v.nameFr, ...(v.nameAr ? { ar: v.nameAr } : {}) },
    offers,
    benefits: fr.map((t, i) => ({ fr: t, ...(ar[i] ? { ar: ar[i] } : {}) })),
    isActive: v.isActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.plan.save", targetType: "membershipPlan", targetId: MEMBERSHIP_PLAN_ID, after: { offers: offers.map((o) => `${o.id}:${o.price.amount / 100}${o.isActive ? "" : "(off)"}`).join(" "), isActive: v.isActive } });
  return { ok: true };
});

/**
 * Achat d'un carnet ou d'un pass (docs/22 § 17.I). Le montant est lu dans l'offre (jamais fourni par le navigateur).
 * Un pass prolonge le pass en cours ; un carnet ajoute des crédits. Par virement : pas de pass semaine (il arrive
 * avec le paiement par carte). Activation à la confirmation du paiement (applyPaymentEvent).
 */
export const startMembershipCheckout = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  const input = z.object({ offerId: z.string().regex(/^[a-z0-9]{2,20}$/) }).safeParse(req.data ?? {});
  if (!input.success) invalidArgument(input.error.issues);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  await requireMemberReady(uid);
  const plan = await activePlan();
  if (!plan) refuse("membership_unavailable", "Le carnet et le pass ne sont pas proposés pour le moment.");
  const offer = pickOffer(plan, input.data.offerId);
  if (!offer) refuse("membership_unavailable", "Cette offre n'est pas proposée pour le moment.");
  const settings = await paymentSettings();
  const provider = providerFor(settings.provider);
  if (provider.id === "bank_transfer" && offer!.kind === "pass" && offer!.days < 30) refuse("offer_card_only", "Le pass semaine se paie par carte.");
  if (provider.id === "bank_transfer") {
    // Un seul virement en attente par personne et par offre : on renvoie la même référence.
    const pending = await db.collection("payments").where("userId", "==", uid).where("purpose", "==", "membership").where("status", "==", "initiated").get();
    const prev = pending.docs.find((d) => d.data().provider === "bank_transfer" && d.data().offerId === offer!.id);
    if (prev) return { paymentId: prev.id, redirectUrl: `/paiement/virement/${prev.id}` };
  }
  const payRef = db.collection("payments").doc();
  const label = offerLabel(offer!);
  await payRef.set({
    purpose: "membership",
    planId: plan!.id,
    offerId: offer!.id,
    kind: offer!.kind,
    days: offer!.days,
    credits: offer!.credits ?? 0,
    label,
    reservationId: null,
    userId: uid,
    type: "payment",
    provider: provider.id,
    mode: settings.mode,
    providerRef: null,
    amount: offer!.price.amount,
    currency: offer!.price.currency,
    status: "initiated",
    processedEventIds: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const checkout = await provider.createCheckout({ paymentId: payRef.id, reservationId: `membership_${uid}`, amount: offer!.price.amount, currency: offer!.price.currency, description: label });
  const transfer = provider.id === "bank_transfer";
  await payRef.update({
    providerRef: checkout.providerRef ?? null,
    ...(transfer ? { reference: checkout.providerRef ?? null, transferDeadline: Timestamp.fromMillis(Date.now() + MEMBERSHIP_TRANSFER_DAYS * 86_400_000) } : {}),
  });
  if (transfer) await sendTransferInstructions(payRef.id);
  return { paymentId: payRef.id, redirectUrl: checkout.redirectUrl };
});

/** Ajoute un pass (jours) et/ou des crédits de carnet, dans une transaction. */
export async function addPassAndCredits(tx: Transaction, uid: string, o: { days: number; credits: number; carnetDays?: number; source: "purchase" | "gift"; paymentId?: string; amount?: number; by?: string; reason?: string }) {
  const memRef = db.doc(`memberships/${uid}`);
  const cRef = carnetRef(uid);
  const [mem, car] = await Promise.all([o.days > 0 ? tx.get(memRef) : Promise.resolve(null), o.credits > 0 ? tx.get(cRef) : Promise.resolve(null)]);
  const now = new Date();
  let passEnd: Date | null = null;
  let carnetEnd: Date | null = null;
  if (o.days > 0) {
    const current = mem!.data();
    const active = current && memberFromDoc({ ...current, suspendedUntil: null });
    const period = nextPassPeriod(current ? { status: active ? "active" : "expired", endAt: (current.endAt as Timestamp).toDate() } : null, now, o.days);
    passEnd = period.endAt;
    tx.set(memRef, {
      uid,
      planId: MEMBERSHIP_PLAN_ID,
      kind: "pass",
      status: "active",
      source: active ? current!.source ?? o.source : o.source,
      startAt: active ? current!.startAt : Timestamp.fromDate(period.startAt),
      endAt: Timestamp.fromDate(period.endAt),
      ...(o.paymentId ? { lastPaymentId: o.paymentId } : {}),
      ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(memRef.collection("periods").doc(o.paymentId ?? db.collection("_").doc().id), {
      startAt: Timestamp.fromDate(period.startAt), endAt: Timestamp.fromDate(period.endAt), days: o.days, source: o.source,
      ...(o.paymentId ? { paymentId: o.paymentId, amount: o.amount ?? 0 } : { grantedBy: o.by ?? null, reason: o.reason ?? "" }),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  if (o.credits > 0) {
    const c = car!.data();
    const stillValid = c && (c.expiresAt as Timestamp | undefined) && (c.expiresAt as Timestamp).toMillis() > now.getTime();
    carnetEnd = new Date(now.getTime() + (o.carnetDays ?? 90) * 86_400_000);
    // Un nouveau carnet repousse la validité de tous les crédits à 3 mois (docs/22 § 17.I).
    tx.set(cRef, {
      uid,
      credits: (stillValid ? Number(c!.credits ?? 0) : 0) + o.credits,
      expiresAt: Timestamp.fromDate(carnetEnd),
      ...(c ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(cRef.collection("movements").doc(), { delta: o.credits, reason: o.source === "purchase" ? "purchase" : "gift", paymentId: o.paymentId ?? null, by: o.by ?? null, note: o.reason ?? "", at: FieldValue.serverTimestamp() });
  }
  return { passEnd, carnetEnd };
}

const uidSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** Offrir un pass (jours) ou des crédits (partenaire, geste commercial, migration…). Journalisé. */
export const adminGrantMembership = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = grantInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { uid, days, credits, reason } = parsed.data;
  if (!(await db.doc(`users/${uid}`).get()).exists) throw new HttpsError("not-found", "Compte introuvable.", { reason: "not_found" });
  const out = await db.runTransaction(async (tx) => {
    const r = await addPassAndCredits(tx, uid, { days, credits, source: "gift", by: actor.uid, reason });
    tx.set(db.collection(`users/${uid}/notifications`).doc(), {
      type: "membership_active",
      title: { fr: days ? "Un pass vous est offert" : "Des crédits vous sont offerts", ar: days ? "باس مُهدى لك" : "رصيد مُهدى لك", en: days ? "A pass for you" : "Credits for you" },
      body: days
        ? { fr: `Vos places sont incluses pendant ${days} jours.`, ar: `أماكنك مشمولة لمدة ${days} يومًا.`, en: `Your seats are included for ${days} days.` }
        : { fr: `${credits} crédit${credits > 1 ? "s" : ""} ajouté${credits > 1 ? "s" : ""} à votre carnet.`, ar: `أُضيف ${credits} رصيد إلى دفترك.`, en: `${credits} credit${credits > 1 ? "s" : ""} added to your pack.` },
      link: "/abonnement",
      createdAt: FieldValue.serverTimestamp(),
    });
    return r;
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.grant", targetType: "user", targetId: uid, after: { days, credits, reason, passEnd: out.passEnd?.toISOString() ?? null } });
  return { ok: true, endAt: out.passEnd?.toISOString() ?? null };
});

/** Retirer un abonnement (abus, erreur). Le remboursement éventuel se décide à part. Journalisé. */
export const adminRevokeMembership = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ uid: uidSchema, reason: z.string().trim().min(2).max(200) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`memberships/${parsed.data.uid}`);
  const cur = (await ref.get()).data();
  if (!cur || cur.status !== "active") refuse("not_member", "Aucun abonnement actif.");
  await ref.update({ status: "revoked", revokedAt: FieldValue.serverTimestamp(), revokedBy: actor.uid, revokeReason: parsed.data.reason, updatedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.revoke", targetType: "user", targetId: parsed.data.uid, after: { reason: parsed.data.reason } });
  return { ok: true };
});

/** Lever une suspension de pass (équipe). Journalisé. */
export const adminLiftSuspension = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ uid: uidSchema, reason: z.string().trim().min(2).max(200) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`memberships/${parsed.data.uid}`);
  if (!(await ref.get()).data()?.suspendedUntil) refuse("not_suspended", "Ce pass n'est pas suspendu.");
  await ref.update({ suspendedUntil: null, lastSuspensionLiftedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.suspension.lift", targetType: "user", targetId: parsed.data.uid, after: { reason: parsed.data.reason } });
  return { ok: true };
});
