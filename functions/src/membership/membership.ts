import {
  MEMBERSHIP_TRANSFER_DAYS,
  canRenewMembership,
  MEMBERSHIP_PLAN_ID,
  membershipPlanInputSchema,
  nextMembershipPeriod,
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
import { memberFromDoc, planRef } from "./state";

/** Formule active (ou null), lue dans une transaction si fournie. */
export async function activePlan(tx?: Transaction): Promise<MembershipPlan | null> {
  const snap = tx ? await tx.get(planRef()) : await planRef().get();
  const p = snap.data();
  return p && p.isActive === true ? ({ id: snap.id, ...p } as MembershipPlan) : null;
}

/** Réglages de la formule par l'équipe (prix, réduction, accès anticipé, avantages, activation). Journalisé. */
export const adminSaveMembershipPlan = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = membershipPlanInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const fr = lines(v.benefitsFr);
  const ar = lines(v.benefitsAr);
  const plan = {
    name: { fr: v.nameFr, ...(v.nameAr ? { ar: v.nameAr } : {}) },
    price: { amount: Math.round(v.priceDh * 100), currency: "MAD" },
    discountPercent: v.discountPercent,
    earlyAccessHours: v.earlyAccessHours,
    benefits: fr.map((t, i) => ({ fr: t, ...(ar[i] ? { ar: ar[i] } : {}) })),
    isActive: v.isActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
  await planRef().set(plan, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.plan.save", targetType: "membershipPlan", targetId: MEMBERSHIP_PLAN_ID, after: { priceDh: v.priceDh, discountPercent: v.discountPercent, earlyAccessHours: v.earlyAccessHours, isActive: v.isActive } });
  return { ok: true };
});

/**
 * Souscription ou renouvellement (possible à partir de 30 jours avant l'échéance). Le montant est lu
 * dans la formule (jamais fourni par le navigateur). Paiement via le prestataire actif (test en attendant
 * le contrat) ; l'abonnement est activé à la confirmation du paiement (applyPaymentEvent).
 */
export const startMembershipCheckout = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  await requireMemberReady(uid);
  const plan = await activePlan();
  if (!plan) refuse("membership_unavailable", "L'abonnement n'est pas proposé pour le moment.");
  const current = (await db.doc(`memberships/${uid}`).get()).data();
  if (current && !canRenewMembership({ status: current.status, endAt: (current.endAt as Timestamp).toDate() })) refuse("already_member", "Votre abonnement est déjà actif.");
  const settings = await paymentSettings();
  const provider = providerFor(settings.provider);
  if (provider.id === "bank_transfer") {
    // Un seul virement en attente par personne : on renvoie la même référence.
    const pending = await db.collection("payments").where("userId", "==", uid).where("purpose", "==", "membership").where("status", "==", "initiated").get();
    const prev = pending.docs.find((d) => d.data().provider === "bank_transfer");
    if (prev) return { paymentId: prev.id, redirectUrl: `/paiement/virement/${prev.id}` };
  }
  const payRef = db.collection("payments").doc();
  await payRef.set({
    purpose: "membership",
    planId: plan!.id,
    reservationId: null,
    userId: uid,
    type: "payment",
    provider: provider.id,
    mode: settings.mode,
    providerRef: null,
    amount: plan!.price.amount,
    currency: plan!.price.currency,
    status: "initiated",
    processedEventIds: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const checkout = await provider.createCheckout({
    paymentId: payRef.id,
    reservationId: `membership_${uid}`,
    amount: plan!.price.amount,
    currency: plan!.price.currency,
    description: `${plan!.name.fr} — 12 mois`,
  });
  const transfer = provider.id === "bank_transfer";
  await payRef.update({
    providerRef: checkout.providerRef ?? null,
    ...(transfer ? { reference: checkout.providerRef ?? null, transferDeadline: Timestamp.fromMillis(Date.now() + MEMBERSHIP_TRANSFER_DAYS * 86_400_000) } : {}),
  });
  if (transfer) await sendTransferInstructions(payRef.id);
  return { paymentId: payRef.id, redirectUrl: checkout.redirectUrl };
});

const uidSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** Offrir un abonnement (partenaire, geste commercial…) : 1 à 24 mois, ajoutés à la période en cours. Journalisé. */
export const adminGrantMembership = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ uid: uidSchema, months: z.number().int().min(1).max(24), reason: z.string().trim().min(2).max(200) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { uid, months, reason } = parsed.data;
  if (!(await db.doc(`users/${uid}`).get()).exists) throw new HttpsError("not-found", "Compte introuvable.", { reason: "not_found" });
  const memRef = db.doc(`memberships/${uid}`);
  const endAt = await db.runTransaction(async (tx) => {
    const current = (await tx.get(memRef)).data();
    const active = memberFromDoc(current);
    const start = active ? (current!.endAt as Timestamp).toDate() : new Date();
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + months);
    tx.set(memRef, {
      uid,
      planId: MEMBERSHIP_PLAN_ID,
      status: "active",
      source: active ? current!.source ?? "gift" : "gift",
      startAt: active ? current!.startAt : Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(memRef.collection("periods").doc(), { startAt: Timestamp.fromDate(start), endAt: Timestamp.fromDate(end), source: "gift", grantedBy: actor.uid, reason, createdAt: FieldValue.serverTimestamp() });
    tx.set(db.collection(`users/${uid}/notifications`).doc(), {
      type: "membership_active",
      title: { fr: "Un abonnement vous est offert", ar: "اشتراك مُهدى لك" },
      body: { fr: `Profitez des prix membres pendant ${months} mois.`, ar: `استفد من أسعار الأعضاء لمدة ${months} شهر.` },
      link: "/abonnement",
      createdAt: FieldValue.serverTimestamp(),
    });
    return end;
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "membership.grant", targetType: "user", targetId: uid, after: { months, reason, endAt: endAt.toISOString() } });
  return { ok: true, endAt: endAt.toISOString() };
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

export { nextMembershipPeriod };
