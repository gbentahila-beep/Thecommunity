import { bookingClosesAt, moveReservationSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { readWaitlist, writeOffers } from "../waitlist/offers";

/**
 * Déplacer une réservation sur une autre date du même rendez-vous, dans UNE transaction : places, verrous, liste
 * d'attente de la date quittée (places aussitôt proposées). La table, le lieu et le résumé de table sont remis à zéro.
 * - équipe : à tout moment avant le début de la nouvelle date ;
 * - membre (décision 38) : jusqu'à la fermeture de sa date (12 h avant pour les Tables), vers une date encore ouverte,
 *   sans repayer ; `minimum` : choix « autre date » quand le minimum n'est pas atteint (sa date est déjà fermée).
 */
export async function moveReservationCore(o: { reservationId: string; targetSessionId: string; actorUid: string; by: "user" | "admin"; proposal?: boolean }) {
  const resRef = db.doc(`reservations/${o.reservationId}`);
  return db.runTransaction(async (tx) => {
    const res = await tx.get(resRef);
    const r = res.data();
    if (!r || (o.by === "user" && r.userId !== o.actorUid)) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    const movable = o.by === "admin" ? ["confirmed", "pending_payment"] : ["confirmed"];
    if (!movable.includes(r.status)) refuse("not_movable", "Seule une réservation active peut être déplacée.");
    if (r.sessionId === o.targetSessionId) refuse("same_session", "C'est déjà cette date.");
    const fromRef = db.doc(`sessions/${r.sessionId}`);
    const toRef = db.doc(`sessions/${o.targetSessionId}`);
    const [from, to, fromLock, toLock, exp] = await Promise.all([
      tx.get(fromRef),
      tx.get(toRef),
      tx.get(fromRef.collection("seatLocks").doc(r.userId)),
      tx.get(toRef.collection("seatLocks").doc(r.userId)),
      tx.get(db.doc(`experiences/${r.experienceId}`)),
    ]);
    const f = from.data()!;
    const t = to.data();
    const e = exp.data() ?? {};
    const now = Date.now();
    if (!t) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    // Proposition de l'équipe (décision 46) : la date proposée peut être un autre événement compatible (regroupement).
    const proposed = o.proposal === true && r.proposal?.status === "pending" && r.proposal.targetSessionId === o.targetSessionId;
    if (o.proposal && !proposed) refuse("no_proposal", "Aucune proposition en cours pour cette date.");
    if (t.experienceId !== r.experienceId && !proposed) refuse("different_experience", "La nouvelle date doit être de la même expérience.");
    if (!["published", "full"].includes(t.status)) refuse("not_open", "La nouvelle date n'est pas ouverte.");
    if ((t.startAt as Timestamp).toMillis() <= now) refuse("already_started", "La nouvelle date est passée.");
    if (o.by === "user" && !proposed) {
      if (now >= bookingClosesAt((f.startAt as Timestamp).toDate(), e.bookingMode).getTime()) refuse("closed", "Les réservations de cette date sont fermées.");
      if (now >= bookingClosesAt((t.startAt as Timestamp).toDate(), e.bookingMode).getTime()) refuse("target_closed", "Les réservations de la nouvelle date sont fermées.");
    }
    if (toLock.exists) refuse("already_booked", "Une place est déjà réservée sur la nouvelle date.");
    const n = r.seats as number;
    const held = r.status === "pending_payment";
    const toAvailable = t.capacity - t.seatsConfirmed - t.seatsHeld;
    if (toAvailable < n) refuse("full", "Plus assez de places sur la nouvelle date.");
    const candidates = await readWaitlist(tx, fromRef);

    tx.update(resRef, {
      sessionId: o.targetSessionId,
      "sessionSnapshot.startAt": t.startAt,
      "sessionSnapshot.endAt": t.endAt,
      groupId: FieldValue.delete(),
      tableSummary: FieldValue.delete(),
      reminders: FieldValue.delete(),
      ...(e.venue?.revealPolicy === "on_group_reveal" ? { venue: FieldValue.delete() } : {}),
      ...(proposed ? { "proposal.status": "accepted", "proposal.answeredAt": Timestamp.fromMillis(now) } : {}),
      ...(t.experienceId !== r.experienceId
        ? { experienceId: t.experienceId, "sessionSnapshot.title": t.experienceSnapshot?.title ?? r.sessionSnapshot?.title, "sessionSnapshot.slug": t.experienceSnapshot?.slug ?? r.sessionSnapshot?.slug, "sessionSnapshot.coverImagePath": t.experienceSnapshot?.coverImagePath ?? "" }
        : {}),
      moves: FieldValue.arrayUnion({ from: r.sessionId, to: o.targetSessionId, at: Timestamp.fromMillis(now), by: o.actorUid, self: o.by === "user" }),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (fromLock.data()?.reservationId === res.id) tx.delete(fromLock.ref);
    tx.set(toLock.ref, { reservationId: res.id, createdAt: FieldValue.serverTimestamp() });
    tx.update(toRef, {
      seatsConfirmed: FieldValue.increment(held ? 0 : n),
      seatsHeld: FieldValue.increment(held ? n : 0),
      status: toAvailable - n <= 0 ? "full" : "published",
      ...(["validated", "revealed"].includes(t.groupsStatus) ? { groupsNeedReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const fromAvailable = f.capacity - (f.seatsConfirmed - (held ? 0 : n)) - (f.seatsHeld - (held ? n : 0));
    const offers = exp.exists ? writeOffers(tx, { sessRef: fromRef, s: f, e, candidates, available: fromAvailable, now }) : { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0 };
    const left = fromAvailable - offers.heldDelta - offers.confirmedDelta;
    tx.update(fromRef, {
      seatsConfirmed: FieldValue.increment((held ? 0 : -n) + offers.confirmedDelta),
      seatsHeld: FieldValue.increment((held ? -n : 0) + offers.heldDelta),
      waitlistCount: FieldValue.increment(offers.waitingDelta),
      ...(["published", "full"].includes(f.status) ? { status: left > 0 ? "published" : "full" } : {}),
      ...(["proposed", "validated", "revealed"].includes(f.groupsStatus) ? { groupsNeedReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { userId: r.userId as string, from: r.sessionId as string, startAt: (t.startAt as Timestamp).toDate() };
  });
}

/** Le membre déplace sa réservation sur une autre date du même rendez-vous (décision 38). Journalisé. */
export const moveMyReservation = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = moveReservationSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const moved = await moveReservationCore({ ...v.data, actorUid: uid, by: "user" });
  await audit({ actorUid: uid, actorRole: "user", action: "reservation.move.self", targetType: "reservation", targetId: v.data.reservationId, before: { sessionId: moved.from }, after: { sessionId: v.data.targetSessionId } });
  return { ok: true };
});
