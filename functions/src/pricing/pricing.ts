import {
  bookingPreferencesSchema,
  computePricing,
  promoInputSchema,
  promoRefusal,
  readServiceFee,
  reservationRequestSchema,
  serviceFeeInputSchema,
  wenzyPriceInputSchema,
  templateInputSchema,
  NO_SERVICE_FEE,
  wenzyPriceOf,
} from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { carnetRef, membershipRef, membershipTerms, passUpcoming, planRef } from "../membership/state";
import { refuse } from "../reservations/refuse";
import { preferencesDoc } from "../reservations/reservation-doc";

/**
 * Prix exact d'une réservation AVANT de réserver (tunnel) : prix membre, code promo, frais de service.
 * Lecture seule ; la réservation recalcule tout dans sa transaction (le serveur fait foi).
 */
export const previewPricing = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = reservationRequestSchema.pick({ sessionId: true, seats: true, promoCode: true, useCarnet: true }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, seats, promoCode, useCarnet } = parsed.data;
  const sess = await db.doc(`sessions/${sessionId}`).get();
  if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const s = sess.data()!;
  const [exp, plan, mem, booking, promo, redemption, past, carnet, upcoming] = await Promise.all([
    db.doc(`experiences/${s.experienceId}`).get(),
    planRef().get(),
    membershipRef(uid).get(),
    db.doc("settings/booking").get(),
    promoCode ? db.doc(`promoCodes/${promoCode}`).get() : Promise.resolve(null),
    promoCode ? db.doc(`promoCodes/${promoCode}/redemptions/${uid}`).get() : Promise.resolve(null),
    promoCode ? db.collection("reservations").where("userId", "==", uid).where("status", "in", ["confirmed", "attended"]).limit(1).get() : Promise.resolve(null),
    carnetRef(uid).get(),
    passUpcoming(uid, Date.now()),
  ]);
  const e = exp.data() ?? {};
  const now = Date.now();
  const terms = membershipTerms({ plan: plan.data(), membership: mem.data(), carnet: carnet.data(), s, e, now, byTeam: false, seats, passUpcoming: upcoming, useCarnet, wenzyPrice: wenzyPriceOf(booking.data()) });
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
    coverage: terms.coverage,
    promo: rule,
    serviceFee: readServiceFee(booking.data()?.serviceFee),
  });
  // docs/22 § 17.I : l'écran de réservation affiche le pass, les crédits du carnet et le garde-fou.
  // Audit 23/11 : pass actif mais événement après sa fin → place non incluse (message dédié dans la page de réservation).
  return { pricing, pass: terms.member, passOutsidePeriod: terms.member && !terms.passForEvent, passLimitReached: terms.passLimitReached, credits: terms.credits };
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

/**
 * Paramètres → Prix Wenzy (super-admin, docs/22 décision 1) : un seul prix par place pour tous les événements Wenzy,
 * frais compris (35 DH par défaut). Enregistrer le prix l'applique aux expériences Wenzy payantes et à leurs dates à
 * venir, et coupe les anciens frais de service (désormais compris dans le prix). Les réservations déjà faites gardent
 * leur prix ; les activités d'organisateurs ne changent pas ici (étape J). Journalisé.
 */
export const adminSaveWenzyPrice = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = wenzyPriceInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const amount = Math.round(v.data.priceDh * 100);
  const ref = db.doc("settings/booking");
  const before = (await ref.get()).data() ?? {};
  await ref.set({ wenzyPrice: amount, serviceFee: { mode: "none", amount: 0, percent: 0 }, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
  const price = { amount, currency: "MAD" };
  const exps = await db.collection("experiences").get();
  const now = Timestamp.now();
  let experiences = 0;
  let sessions = 0;
  for (const e of exps.docs) {
    const d = e.data();
    // Activités d'organisateurs et événements gratuits : inchangés.
    if (d.organizerId || Number(d.price?.amount ?? 0) === 0) continue;
    const future = await db.collection("sessions").where("experienceId", "==", e.id).where("startAt", ">=", now).get();
    const writes: [FirebaseFirestore.DocumentReference, Record<string, unknown>][] = [[e.ref, { price, memberPrice: null, updatedAt: FieldValue.serverTimestamp() }], ...future.docs.map((s) => [s.ref, { price }] as [FirebaseFirestore.DocumentReference, Record<string, unknown>])];
    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      writes.slice(i, i + 400).forEach(([r, data]) => batch.update(r, data));
      await batch.commit();
    }
    experiences++;
    sessions += future.size;
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.wenzyPrice", targetType: "settings", targetId: "booking", before: { wenzyPrice: before.wenzyPrice ?? null, serviceFee: before.serviceFee ?? null }, after: { wenzyPrice: amount, experiences, sessions } });
  return { wenzyPrice: amount, experiences, sessions };
});

/**
 * Paramètres → Modèles (docs/22, décision 21) : créer, modifier, masquer un modèle d'événement. Un modèle livré avec le
 * site, une fois modifié, est enregistré sous le même identifiant et l'emporte sur la version d'origine. Journalisé.
 */
export const adminSaveTemplate = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = templateInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`eventTemplates/${v.data.id}`);
  const before = (await ref.get()).data() ?? null;
  await ref.set({ ...JSON.parse(JSON.stringify(v.data)), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before ? "template.update" : "template.create", targetType: "eventTemplate", targetId: v.data.id, after: { name: v.data.name, isActive: v.data.isActive } });
  return { id: v.data.id };
});

/** Supprime un modèle créé dans l'appli, ou remet un modèle livré avec le site dans sa version d'origine. Journalisé. */
export const adminDeleteTemplate = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = z.object({ id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/) }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  await db.doc(`eventTemplates/${v.data.id}`).delete();
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "template.delete", targetType: "eventTemplate", targetId: v.data.id });
  return { ok: true };
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

