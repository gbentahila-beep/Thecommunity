import {
  bookingPreferencesSchema,
  computePricing,
  promoInputSchema,
  promoRefusal,
  readServiceFee,
  reservationRequestSchema,
  serviceFeeInputSchema,
} from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { membershipRef, membershipTerms, planRef } from "../membership/state";
import { refuse } from "../reservations/refuse";
import { preferencesDoc } from "../reservations/reservation-doc";

/**
 * Prix exact d'une réservation AVANT de réserver (tunnel) : prix membre, code promo, frais de service.
 * Lecture seule ; la réservation recalcule tout dans sa transaction (le serveur fait foi).
 */
export const previewPricing = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = reservationRequestSchema.pick({ sessionId: true, seats: true, promoCode: true }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, seats, promoCode } = parsed.data;
  const sess = await db.doc(`sessions/${sessionId}`).get();
  if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const s = sess.data()!;
  const [exp, plan, mem, booking, promo, redemption, past] = await Promise.all([
    db.doc(`experiences/${s.experienceId}`).get(),
    planRef().get(),
    membershipRef(uid).get(),
    db.doc("settings/booking").get(),
    promoCode ? db.doc(`promoCodes/${promoCode}`).get() : Promise.resolve(null),
    promoCode ? db.doc(`promoCodes/${promoCode}/redemptions/${uid}`).get() : Promise.resolve(null),
    promoCode ? db.collection("reservations").where("userId", "==", uid).where("status", "in", ["confirmed", "attended"]).limit(1).get() : Promise.resolve(null),
  ]);
  const e = exp.data() ?? {};
  const now = Date.now();
  const terms = membershipTerms({ plan: plan.data(), membership: mem.data(), s, e, now, byTeam: false });
  let rule: { code: string; type: "percent" | "fixed"; value: number } | undefined;
  if (promoCode) {
    const pd = promo?.data();
    const why = promoRefusal(
      pd ? ({ ...pd, validFrom: pd.validFrom ? (pd.validFrom as Timestamp).toDate() : null, validTo: (pd.validTo as Timestamp).toDate() } as Parameters<typeof promoRefusal>[0]) : null,
      { now: new Date(now), alreadyUsedByUser: Boolean(redemption?.exists), hasPastBooking: Boolean(past && !past.empty) },
    );
    if (why) refuse(why, "Ce code promo n'est pas utilisable.");
    rule = { code: promo!.id, type: pd!.type, value: pd!.value };
  }
  const pricing = computePricing(s.price.amount, seats, s.price.currency, {
    memberUnitAmount: terms.memberUnitAmount,
    promo: rule,
    serviceFee: readServiceFee(booking.data()?.serviceFee),
  });
  return { pricing };
});

/** Le membre modifie son régime, ses allergies ou ses langues de table jusqu'au début de l'expérience. */
export const updateReservationPreferences = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ reservationId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), preferences: bookingPreferencesSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`reservations/${parsed.data.reservationId}`);
  const r = (await ref.get()).data();
  if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  if (!["pending_payment", "confirmed"].includes(r.status)) refuse("not_editable", "Cette réservation n'est plus modifiable.");
  if ((r.sessionSnapshot?.startAt as Timestamp).toMillis() <= Date.now()) refuse("started", "L'expérience a déjà commencé.");
  await ref.update({ preferences: preferencesDoc(parsed.data.preferences), updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
});

/** Back-office : créer ou modifier un code promo (équipe). Le compteur d'utilisations n'est jamais saisi à la main. */
export const adminSavePromo = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ data: z.unknown(), create: z.boolean() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = promoInputSchema.safeParse(parsed.data.data);
  if (!v.success) invalidArgument(v.error.issues);
  const p = v.data;
  const ref = db.doc(`promoCodes/${p.code}`);
  const doc = {
    code: p.code,
    type: p.type,
    // Pourcentage tel quel ; montant fixe saisi en dirhams, enregistré en centimes.
    value: p.type === "percent" ? p.value : Math.round(p.value * 100),
    validFrom: p.validFrom ? Timestamp.fromDate(new Date(`${p.validFrom}T00:00:00+01:00`)) : null,
    validTo: Timestamp.fromDate(new Date(`${p.validTo}T23:59:59+01:00`)),
    maxRedemptions: p.maxRedemptions,
    firstBookingOnly: p.firstBookingOnly,
    isActive: p.isActive,
    description: p.description,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  };
  const before = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (parsed.data.create && snap.exists) refuse("promo_exists", "Ce code existe déjà.");
    if (!parsed.data.create && !snap.exists) throw new HttpsError("not-found", "Code introuvable.", { reason: "not_found" });
    tx.set(ref, { ...doc, ...(snap.exists ? {} : { redemptionsCount: 0, createdAt: FieldValue.serverTimestamp(), createdBy: actor.uid }) }, { merge: true });
    return snap.data() ?? null;
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before ? "promo.update" : "promo.create", targetType: "promoCode", targetId: p.code, before, after: p });
  return { code: p.code };
});

/** Paramètres → Frais de service (super-admin). S'appliquent aux nouvelles réservations payantes. Journalisé. */
export const adminSaveBookingSettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = serviceFeeInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const fee = v.data.mode === "per_seat" ? { mode: "per_seat", amount: Math.round(v.data.amountDh * 100), percent: 0 } : v.data.mode === "percent" ? { mode: "percent", amount: 0, percent: v.data.percent } : { mode: "none", amount: 0, percent: 0 };
  const ref = db.doc("settings/booking");
  const before = (await ref.get()).data()?.serviceFee ?? null;
  await ref.set({ serviceFee: fee, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.serviceFee", targetType: "settings", targetId: "booking", before, after: fee });
  return { serviceFee: fee };
});

