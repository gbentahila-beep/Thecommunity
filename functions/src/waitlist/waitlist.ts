import { bookingClosesAt, maxSeatsFor, reservationRequestSchema, seatsAvailable } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { refuse, requireMemberReady } from "../reservations/create-reservation";

/**
 * Inscription sur la liste d'attente d'une date complète (expériences en réservation directe ;
 * pour les expériences sur demande, la demande joue ce rôle). Ordre d'arrivée ; aucun paiement.
 * Quand une place se libère, elle est proposée automatiquement (voir waitlist/offers.ts).
 */
export const joinWaitlist = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  if (token.email_verified !== true) refuse("email_not_verified", "Confirmez votre adresse e-mail.");
  const parsed = reservationRequestSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, seats } = parsed.data;
  await requireMemberReady(uid);

  const sessRef = db.doc(`sessions/${sessionId}`);
  const entryRef = sessRef.collection("waitlist").doc(uid);
  return db.runTransaction(async (tx) => {
    const [sess, lock, entry] = await Promise.all([tx.get(sessRef), tx.get(sessRef.collection("seatLocks").doc(uid)), tx.get(entryRef)]);
    if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    const s = sess.data()!;
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    const e = exp.data();
    if (!e || e.status !== "published" || !["published", "full"].includes(s.status)) refuse("not_open", "Date non ouverte.");
    if (e!.admission === "on_request") refuse("approval_required", "Expérience sur demande.");
    if (Date.now() >= bookingClosesAt((s.startAt as Timestamp).toDate(), e!.bookingMode).getTime()) refuse("closed", "Inscriptions fermées.");
    if (seats > maxSeatsFor(e!)) refuse("too_many_seats", "Trop de places.");
    if (lock.exists) refuse("already_booked", "Vous avez déjà une place pour cette date.");
    if (entry.exists && ["waiting", "offered"].includes(entry.data()!.status)) refuse("already_waiting", "Déjà sur la liste d'attente.");
    if (seatsAvailable(s as never) >= seats) refuse("seats_available", "Des places sont disponibles : réservez directement.");

    const snap = s.experienceSnapshot ?? {};
    tx.set(entryRef, {
      userId: uid,
      sessionId,
      seats,
      status: "waiting",
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
    tx.update(sessRef, { waitlistCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    return { status: "waiting" };
  });
});

/** Quitter la liste d'attente (tant qu'aucune place n'a été proposée ; sinon, annuler la réservation proposée). */
export const leaveWaitlist = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ sessionId: reservationRequestSchema.shape.sessionId }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const sessRef = db.doc(`sessions/${parsed.data.sessionId}`);
  const entryRef = sessRef.collection("waitlist").doc(uid);
  await db.runTransaction(async (tx) => {
    const entry = await tx.get(entryRef);
    if (!entry.exists || entry.data()!.status !== "waiting") refuse("not_waiting", "Vous n'êtes pas sur la liste d'attente.");
    tx.update(entryRef, { status: "left", updatedAt: FieldValue.serverTimestamp() });
    tx.update(sessRef, { waitlistCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});
