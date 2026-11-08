import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { notifyReservationChange } from "../notify/reminders";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { cancelReservationCore, idSchema } from "../reservations/cancel-reservation";
import { refuse } from "../reservations/create-reservation";
import { readWaitlist, writeOffers } from "../waitlist/offers";

const reasonSchema = z.string().trim().min(2, "required").max(200, "tooLong");

const requireTeam = (req: CallableRequest<unknown>) => requireRole(req, ["admin", "superadmin"]);

async function notify(uid: string, type: string, title: { fr: string; ar: string }, body: { fr: string; ar: string }, link: string) {
  await db.collection(`users/${uid}/notifications`).add({ type, title, body, link, createdAt: FieldValue.serverTimestamp() });
}
const dh = (centimes: number) => `${(centimes / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;

/**
 * Annulation d'une réservation par l'équipe. Remboursement au choix : intégral (par défaut, décision D6),
 * selon la politique de l'expérience, ou aucun (ex. comportement contraire à la charte). Motif obligatoire,
 * journalisé ; la personne est prévenue.
 */
export const adminCancelReservation = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, refund: z.enum(["full", "policy", "none"]).default("full"), reason: reasonSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, refund, reason } = parsed.data;
  const res = await cancelReservationCore({ reservationId, by: "admin", actorUid: actor.uid, refundMode: refund, reason, allowStarted: true });
  await notify(
    res.userId,
    "event_cancelled",
    { fr: "Votre réservation a été annulée", ar: "تم إلغاء حجزك" },
    res.refundAmount > 0
      ? { fr: `L'équipe a annulé votre réservation. ${dh(res.refundAmount)} vous sont remboursés.`, ar: `ألغى الفريق حجزك. سيتم استرجاع ${dh(res.refundAmount)}.` }
      : { fr: "L'équipe a annulé votre réservation. Contactez-nous pour toute question.", ar: "ألغى الفريق حجزك. تواصل معنا لأي استفسار." },
    `/espace/reservations/${reservationId}`,
  );
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "reservation.cancel", targetType: "reservation", targetId: reservationId, after: { refund, refundAmount: res.refundAmount, reason } });
  return { ok: true, refundAmount: res.refundAmount, refundStatus: res.refundStatus };
});

/**
 * Annulation d'une date entière (météo, partenaire fermé…) : la date est fermée, chaque réservation
 * est annulée et remboursée intégralement, la liste d'attente et les demandes en cours sont closes,
 * tout le monde est prévenu. Journalisé.
 */
export const adminCancelSession = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ sessionId: idSchema, reason: reasonSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, reason } = parsed.data;
  const sessRef = db.doc(`sessions/${sessionId}`);
  await db.runTransaction(async (tx) => {
    const s = (await tx.get(sessRef)).data();
    if (!s) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    if (s.status === "cancelled") refuse("already_cancelled", "Cette date est déjà annulée.");
    // Plus aucune réservation ni offre possible à partir d'ici.
    tx.update(sessRef, { status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: actor.uid, reason }, updatedAt: FieldValue.serverTimestamp() });
  });

  const active = await db.collection("reservations").where("sessionId", "==", sessionId).where("status", "in", ["confirmed", "pending_payment"]).get();
  let refunded = 0;
  const failures: string[] = [];
  for (const d of active.docs) {
    try {
      const res = await cancelReservationCore({ reservationId: d.id, by: "admin", actorUid: actor.uid, refundMode: "full", reason: "session_cancelled", allowStarted: true });
      refunded += res.refundAmount;
      await notify(
        res.userId,
        "event_cancelled",
        { fr: "Expérience annulée", ar: "تم إلغاء التجربة" },
        {
          fr: `Nous sommes désolés : cette date est annulée (${reason}).${res.refundAmount > 0 ? ` ${dh(res.refundAmount)} vous sont remboursés intégralement.` : ""}`,
          ar: `نعتذر: تم إلغاء هذا الموعد (${reason}).${res.refundAmount > 0 ? ` سيتم استرجاع ${dh(res.refundAmount)} بالكامل.` : ""}`,
        },
        `/espace/reservations/${d.id}`,
      );
    } catch {
      failures.push(d.id);
    }
  }
  const [waiting, requests] = await Promise.all([
    sessRef.collection("waitlist").where("status", "==", "waiting").get(),
    db.collection("bookingRequests").where("sessionId", "==", sessionId).where("status", "==", "pending").get(),
  ]);
  const batch = db.batch();
  for (const w of waiting.docs) batch.update(w.ref, { status: "left", updatedAt: FieldValue.serverTimestamp() });
  for (const q of requests.docs) batch.update(q.ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  batch.update(sessRef, { waitlistCount: 0 });
  await batch.commit();
  for (const w of waiting.docs) {
    await notify(w.id, "event_cancelled", { fr: "Expérience annulée", ar: "تم إلغاء التجربة" }, { fr: "La date pour laquelle vous étiez sur liste d'attente est annulée.", ar: "تم إلغاء الموعد الذي كنت على قائمة انتظاره." }, "/experiences");
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "session.cancel", targetType: "session", targetId: sessionId, after: { reason, reservations: active.size, refunded, failures } });
  return { ok: true, cancelled: active.size - failures.length, refunded, failures };
});

/**
 * Déplace une réservation vers une autre date de la MÊME expérience, dans une transaction sur les deux dates :
 * places vérifiées sur la nouvelle date, libérées (et proposées à la liste d'attente) sur l'ancienne.
 * Le montant payé est conservé tel quel. Journalisé ; la personne est prévenue.
 */
export const adminMoveReservation = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, targetSessionId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, targetSessionId } = parsed.data;
  const resRef = db.doc(`reservations/${reservationId}`);

  const moved = await db.runTransaction(async (tx) => {
    const res = await tx.get(resRef);
    const r = res.data();
    if (!r) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (r.status !== "confirmed" && r.status !== "pending_payment") refuse("not_movable", "Seule une réservation active peut être déplacée.");
    if (r.sessionId === targetSessionId) refuse("same_session", "C'est déjà cette date.");
    const fromRef = db.doc(`sessions/${r.sessionId}`);
    const toRef = db.doc(`sessions/${targetSessionId}`);
    const [from, to, fromLock, toLock] = await Promise.all([
      tx.get(fromRef),
      tx.get(toRef),
      tx.get(fromRef.collection("seatLocks").doc(r.userId)),
      tx.get(toRef.collection("seatLocks").doc(r.userId)),
    ]);
    const f = from.data()!;
    const t = to.data();
    if (!t) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    if (t.experienceId !== r.experienceId) refuse("different_experience", "La nouvelle date doit être de la même expérience.");
    if (!["published", "full"].includes(t.status)) refuse("not_open", "La nouvelle date n'est pas ouverte.");
    if ((t.startAt as Timestamp).toMillis() <= Date.now()) refuse("already_started", "La nouvelle date est passée.");
    if (toLock.exists) refuse("already_booked", "Cette personne a déjà une place sur la nouvelle date.");
    const n = r.seats as number;
    const held = r.status === "pending_payment";
    const toAvailable = t.capacity - t.seatsConfirmed - t.seatsHeld;
    if (toAvailable < n) refuse("full", "Plus assez de places sur la nouvelle date.");
    const exp = await tx.get(db.doc(`experiences/${r.experienceId}`));
    const candidates = await readWaitlist(tx, fromRef);

    tx.update(resRef, {
      sessionId: targetSessionId,
      "sessionSnapshot.startAt": t.startAt,
      "sessionSnapshot.endAt": t.endAt,
      moves: FieldValue.arrayUnion({ from: r.sessionId, to: targetSessionId, at: Timestamp.now(), by: actor.uid }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (fromLock.data()?.reservationId === res.id) tx.delete(fromLock.ref);
    tx.set(toLock.ref, { reservationId: res.id, createdAt: FieldValue.serverTimestamp() });
    tx.update(toRef, {
      seatsConfirmed: FieldValue.increment(held ? 0 : n),
      seatsHeld: FieldValue.increment(held ? n : 0),
      status: toAvailable - n <= 0 ? "full" : "published",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const fromAvailable = f.capacity - (f.seatsConfirmed - (held ? 0 : n)) - (f.seatsHeld - (held ? n : 0));
    const offers = exp.exists ? writeOffers(tx, { sessRef: fromRef, s: f, e: exp.data()!, candidates, available: fromAvailable, now: Date.now() }) : { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0 };
    const left = fromAvailable - offers.heldDelta - offers.confirmedDelta;
    tx.update(fromRef, {
      seatsConfirmed: FieldValue.increment((held ? 0 : -n) + offers.confirmedDelta),
      seatsHeld: FieldValue.increment((held ? -n : 0) + offers.heldDelta),
      waitlistCount: FieldValue.increment(offers.waitingDelta),
      ...(["published", "full"].includes(f.status) ? { status: left > 0 ? "published" : "full" } : {}),
      ...(["validated", "revealed"].includes(f.groupsStatus) ? { groupsNeedReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { userId: r.userId as string, from: r.sessionId as string, startAt: (t.startAt as Timestamp).toDate() };
  });

  const when = moved.startAt.toLocaleString("fr-FR", { timeZone: "Africa/Casablanca", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const whenAr = moved.startAt.toLocaleString("ar-MA", { timeZone: "Africa/Casablanca", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  await notify(moved.userId, "event_updated", { fr: "Votre réservation a changé de date", ar: "تغيّر موعد حجزك" }, { fr: `Nouvelle date : ${when}.`, ar: `الموعد الجديد: ${whenAr}.` }, `/espace/reservations/${reservationId}`);
  await notifyReservationChange(reservationId, "date").catch(() => undefined);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "reservation.move", targetType: "reservation", targetId: reservationId, before: { sessionId: moved.from }, after: { sessionId: targetSessionId } });
  return { ok: true };
});

/**
 * Pointage le jour J : présent (« attended »), absent (« no_show ») ou retour à « confirmée ».
 * Possible à partir de 3 h avant le début. Les absences nourrissent l'historique vu par l'équipe.
 */
export const adminCheckIn = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, presence: z.enum(["attended", "no_show", "confirmed"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, presence } = parsed.data;
  const resRef = db.doc(`reservations/${reservationId}`);
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(resRef)).data();
    if (!r) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (!["confirmed", "attended", "no_show"].includes(r.status)) refuse("not_checkable", "Seule une réservation confirmée se pointe.");
    if ((r.sessionSnapshot.startAt as Timestamp).toMillis() - Date.now() > 3 * 3_600_000) refuse("too_early", "Le pointage ouvre 3 h avant le début.");
    tx.update(resRef, {
      status: presence,
      checkedInAt: presence === "confirmed" ? null : FieldValue.serverTimestamp(),
      checkedInBy: presence === "confirmed" ? null : actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `reservation.checkin.${presence}`, targetType: "reservation", targetId: reservationId });
  return { ok: true };
});

/** Journalise un export de données personnelles (liste de participants, réservations) avant son téléchargement. */
export const adminLogExport = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ kind: z.enum(["participants", "reservations", "users"]), targetId: z.string().max(128).default(""), rows: z.number().int().min(0).max(100_000) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `export.${parsed.data.kind}`, targetType: "export", targetId: parsed.data.targetId || parsed.data.kind, after: { rows: parsed.data.rows } });
  return { ok: true };
});
