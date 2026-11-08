import { preferencesDoc } from "../reservations/reservation-doc";
import { ACCEPTED_HOLD_HOURS, bookingClosesAt, bookingRequestSchema, maxSeatsFor, normalizeInstagram } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { memberFromDoc, membershipRef } from "../membership/state";
import { refuse, requireMemberReady, runReservation } from "../reservations/create-reservation";

const idSchema = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/);

/**
 * Demande de participation à une date « sur demande » (choix de l'équipe, par expérience).
 * Aucune place n'est bloquée et rien n'est payé à ce stade : l'équipe accepte ou refuse,
 * puis la personne acceptée a 24 h pour payer.
 * Une seule demande par personne et par date (identifiant `{sessionId}_{uid}`).
 */
export const requestBooking = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  const parsed = bookingRequestSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, seats, message, instagram, preferences } = parsed.data;
  await requireMemberReady(uid);

  const sessRef = db.doc(`sessions/${sessionId}`);
  const reqRef = db.doc(`bookingRequests/${sessionId}_${uid}`);
  const lockRef = sessRef.collection("seatLocks").doc(uid);
  return db.runTransaction(async (tx) => {
    const [sess, existing, lock, mem] = await Promise.all([tx.get(sessRef), tx.get(reqRef), tx.get(lockRef), tx.get(membershipRef(uid))]);
    if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    const s = sess.data()!;
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    const e = exp.data();
    if (!e || e.status !== "published" || !["published", "full"].includes(s.status)) refuse("not_open", "Date non ouverte.");
    if (e!.admission !== "on_request") refuse("direct_booking", "Cette expérience se réserve directement.");
    if (e!.membersOnly === true && !memberFromDoc(mem.data())) refuse("members_only", "Expérience réservée aux membres.");
    const startAt = (s.startAt as Timestamp).toDate();
    if (Date.now() >= bookingClosesAt(startAt, e!.bookingMode).getTime()) refuse("closed", "Les inscriptions sont fermées.");
    if (seats > maxSeatsFor(e!)) refuse("too_many_seats", "Trop de places.");
    if (e!.requestMessageRequired === true && !message) invalidArgument([{ path: ["message"], message: "required" }]);
    if (e!.requestInstagramRequired === true && !instagram) invalidArgument([{ path: ["instagram"], message: "required" }]);
    if (existing.exists && ["pending", "accepted"].includes(existing.data()!.status)) refuse("already_requested", "Demande déjà envoyée.");
    if (existing.exists && existing.data()!.status === "declined") refuse("request_declined", "Demande non retenue pour cette date.");
    if (lock.exists) refuse("already_booked", "Vous avez déjà une place pour cette date.");

    const snap = s.experienceSnapshot ?? {};
    tx.set(reqRef, {
      userId: uid,
      sessionId,
      experienceId: s.experienceId,
      cityId: s.cityId,
      seats,
      message,
      instagram: instagram ? normalizeInstagram(instagram) : null,
      ...(preferences ? { preferences: preferencesDoc(preferences) } : {}),
      status: "pending",
      sessionSnapshot: {
        title: snap.title ?? e!.title,
        slug: snap.slug ?? e!.slug,
        startAt: s.startAt,
        endAt: s.endAt,
        district: snap.district ?? e!.district ?? "",
        coverImagePath: snap.coverImagePath ?? e!.images?.[0]?.path ?? "",
        categoryId: s.categoryId,
        bookingMode: e!.bookingMode,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { requestId: reqRef.id, status: "pending" };
  });
});

/** La personne retire sa demande tant qu'elle n'a pas été traitée. */
export const cancelBookingRequest = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ requestId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`bookingRequests/${parsed.data.requestId}`);
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data();
    if (!r || r.userId !== uid) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });
    if (r.status !== "pending") refuse("request_not_pending", "Cette demande a déjà été traitée.");
    tx.update(ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

const NOTIFY = {
  accepted: {
    title: { fr: "Votre demande est acceptée", ar: "تم قبول طلبك" },
    body: { fr: "Une place vous est réservée : vous avez 24 h pour payer et confirmer votre participation.", ar: "تم حجز مكان لك: لديك 24 ساعة للدفع وتأكيد مشاركتك." },
  },
  declined: {
    title: { fr: "Votre demande n'a pas été retenue", ar: "لم يتم قبول طلبك" },
    body: { fr: "Merci pour votre intérêt. Votre demande pour cette date n'a pas été retenue ; d'autres expériences vous attendent.", ar: "شكرًا لاهتمامك. لم يتم قبول طلبك لهذا الموعد؛ تجارب أخرى في انتظارك." },
  },
};

/**
 * L'équipe accepte ou refuse une demande. Acceptation : réservation créée dans la même transaction
 * que le passage de la demande à « accepted » (places vérifiées, aucune surréservation possible),
 * 24 h pour payer ; gratuit : confirmé directement. Journalisé, et la personne est prévenue.
 */
export const adminDecideRequest = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ requestId: idSchema, decision: z.enum(["accept", "decline"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { requestId, decision } = parsed.data;
  const ref = db.doc(`bookingRequests/${requestId}`);
  const r = (await ref.get()).data();
  if (!r) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });

  let reservationId: string | null = null;
  if (decision === "accept") {
    const res = await runReservation({
      uid: r.userId,
      sessionId: r.sessionId,
      seats: r.seats,
      requestId,
      holdMs: ACCEPTED_HOLD_HOURS * 3_600_000,
      actorUid: actor.uid,
    });
    reservationId = res.reservationId;
  } else {
    await db.runTransaction(async (tx) => {
      const cur = (await tx.get(ref)).data();
      if (cur?.status !== "pending") refuse("request_not_pending", "Cette demande a déjà été traitée.");
      tx.update(ref, { status: "declined", decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
    });
  }

  const n = decision === "accept" ? NOTIFY.accepted : NOTIFY.declined;
  await db.collection(`users/${r.userId}/notifications`).add({
    type: decision === "accept" ? "request_accepted" : "request_declined",
    title: n.title,
    body: n.body,
    link: reservationId ? `/espace/reservations/${reservationId}` : `/experiences/${r.sessionSnapshot?.slug ?? ""}`,
    createdAt: FieldValue.serverTimestamp(),
  });
  await audit({
    actorUid: actor.uid,
    actorRole: roleOf(req),
    action: decision === "accept" ? "request.accept" : "request.decline",
    targetType: "bookingRequest",
    targetId: requestId,
    after: { userId: r.userId, sessionId: r.sessionId, reservationId },
  });
  return { ok: true, reservationId };
});
