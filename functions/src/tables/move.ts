import { bookingClosesAt, moveReservationSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { readWaitlist, writeOffers } from "../waitlist/offers";
import { notifyWaitlistOffers } from "../waitlist/notify-offers";
import { capacityBefore } from "../reservations/create-reservation";
import { requireWindowOpen } from "../rendezvous/window";
import { removeFromGroup } from "../groups/membership";
import { notifyReservationChange } from "../notify/reminders";

/**
 * Déplacer une réservation sur une autre date du même rendez-vous, dans UNE transaction : places, verrous, liste
 * d'attente de la date quittée (places aussitôt proposées). La table, le lieu et le résumé de table sont remis à zéro.
 * - équipe : à tout moment avant le début de la nouvelle date ;
 * - membre (décision 38) : jusqu'à la fermeture de sa date (12 h avant pour les Tables), vers une date encore ouverte,
 *   sans repayer ; `minimum` : choix « autre date » quand le minimum n'est pas atteint (sa date est déjà fermée).
 */
export async function moveReservationCore(o: { reservationId: string; targetSessionId: string; actorUid: string; by: "user" | "admin"; proposal?: boolean; /** Lot C : vers la gamme voisine du même rendez-vous, même date. */ tierMove?: boolean }) {
  const resRef = db.doc(`reservations/${o.reservationId}`);
  // Audit 23/11 : plafond de la nouvelle date d'après la capacité des lieux compatibles (comme à la réservation), lu hors transaction.
  const targetCap = await capacityBefore(o.targetSessionId);
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
    // Groupe de la date quittée (la personne en est retirée) et expérience de la date proposée si elle est différente.
    const [groupSnap, targetExp] = await Promise.all([
      r.groupId ? tx.get(db.doc(`groups/${r.groupId}`)) : Promise.resolve(null),
      t && t.experienceId !== r.experienceId ? tx.get(db.doc(`experiences/${t.experienceId}`)) : Promise.resolve(null),
    ]);
    const now = Date.now();
    if (!t) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    // Proposition de l'équipe (décision 46) : la date proposée peut être un autre événement compatible (regroupement).
    const proposed = o.proposal === true && r.proposal?.status === "pending" && r.proposal.targetSessionId === o.targetSessionId;
    if (o.proposal && !proposed) refuse("no_proposal", "Aucune proposition en cours pour cette date.");
    // Lot C : gamme voisine — autre gamme (autre expérience) du MÊME rendez-vous, à la MÊME date.
    const te0 = targetExp?.data();
    const tierMove = o.tierMove === true && o.by === "admin" && Boolean(e.rendezvousId) && te0?.rendezvousId === e.rendezvousId && (t.startAt as Timestamp).toMillis() === (f.startAt as Timestamp).toMillis();
    if (o.tierMove && !tierMove) refuse("not_same_rendezvous", "La gamme voisine doit être du même rendez-vous, à la même date.");
    if (t.experienceId !== r.experienceId && !proposed && !tierMove) refuse("different_experience", "La nouvelle date doit être de la même expérience.");
    if (!["published", "full"].includes(t.status)) refuse("not_open", "La nouvelle date n'est pas ouverte.");
    if ((t.startAt as Timestamp).toMillis() <= now) refuse("already_started", "La nouvelle date est passée.");
    if (o.by === "user" && !proposed) {
      if (now >= bookingClosesAt((f.startAt as Timestamp).toDate(), e).getTime()) refuse("closed", "Les réservations de cette date sont fermées.");
      if (now >= bookingClosesAt((t.startAt as Timestamp).toDate(), e).getTime()) refuse("target_closed", "Les réservations de la nouvelle date sont fermées.");
      // docs/25 : rendez-vous — seulement vers une date ouverte (la suivante, ou deux avec le Pass).
      if (e.rendezvousId) await requireWindowOpen(tx, { experienceId: t.experienceId, sessionId: o.targetSessionId, e, membership: (await tx.get(db.doc(`memberships/${r.userId}`))).data(), now });
    }
    if (toLock.exists) refuse("already_booked", "Une place est déjà réservée sur la nouvelle date.");
    const n = r.seats as number;
    const held = r.status === "pending_payment";
    const toCapacity = targetCap === null ? (t.capacity as number) : Math.min(t.capacity as number, targetCap);
    const toAvailable = toCapacity - t.seatsConfirmed - t.seatsHeld;
    if (toAvailable < n) refuse("full", "Plus assez de places sur la nouvelle date.");
    const candidates = await readWaitlist(tx, fromRef);
    // Lieu : celui de l'expérience de la nouvelle date (proposition vers un autre événement), sinon inchangé
    // (sauf lieu révélé avec le groupe : il sera révélé de nouveau pour la nouvelle date).
    const te = targetExp?.data();
    const venueField = te
      ? te.venue?.revealPolicy === "immediate"
        ? { venue: { name: te.venue.name ?? "", address: te.venue.address ?? "", ...(te.venue.geo ? { geo: te.venue.geo } : {}) } }
        : { venue: FieldValue.delete() }
      : e.venue?.revealPolicy === "on_group_reveal" ? { venue: FieldValue.delete() } : {};
    // Audit 23/11 : un déplacement choisi par le membre garde la date d'origine pour le calcul du remboursement.
    const prevBasis = r.refundBasisAt as Timestamp | undefined;
    const fromStart = r.sessionSnapshot.startAt as Timestamp;
    const basisField = o.by === "user" && !proposed ? { refundBasisAt: prevBasis && prevBasis.toMillis() < fromStart.toMillis() ? prevBasis : fromStart } : {};

    if (groupSnap?.exists) removeFromGroup(tx, groupSnap, r.userId as string, n);
    tx.update(resRef, {
      sessionId: o.targetSessionId,
      "sessionSnapshot.startAt": t.startAt,
      "sessionSnapshot.endAt": t.endAt,
      groupId: FieldValue.delete(),
      tableSummary: FieldValue.delete(),
      reminders: FieldValue.delete(),
      ...venueField,
      ...basisField,
      ...(proposed ? { "proposal.status": "accepted", "proposal.answeredAt": Timestamp.fromMillis(now) } : {}),
      ...(tierMove ? { tier: te0?.venueTier ?? null, tierMovedFrom: e.venueTier ?? null } : {}),
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
    const offers = exp.exists ? writeOffers(tx, { sessRef: fromRef, s: f, e, candidates, available: fromAvailable, now }) : { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0, offeredReservations: [] as string[] };
    const left = fromAvailable - offers.heldDelta - offers.confirmedDelta;
    tx.update(fromRef, {
      seatsConfirmed: FieldValue.increment((held ? 0 : -n) + offers.confirmedDelta),
      seatsHeld: FieldValue.increment((held ? -n : 0) + offers.heldDelta),
      waitlistCount: FieldValue.increment(offers.waitingDelta),
      ...(["published", "full"].includes(f.status) ? { status: left > 0 ? "published" : "full" } : {}),
      ...(["proposed", "validated", "revealed"].includes(f.groupsStatus) ? { groupsNeedReview: true } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { userId: r.userId as string, from: r.sessionId as string, startAt: (t.startAt as Timestamp).toDate(), offered: offers.offeredReservations };
  }).then(async (out) => {
    await notifyWaitlistOffers(out.offered);
    return out;
  });
}

/** Le membre déplace sa réservation sur une autre date du même rendez-vous (décision 38). Journalisé. */
export const moveMyReservation = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = moveReservationSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const moved = await moveReservationCore({ ...v.data, actorUid: uid, by: "user" });
  // Audit 23/11 : confirmation par e-mail avec la nouvelle invitation agenda.
  await notifyReservationChange(v.data.reservationId, "date", { self: true }).catch(() => undefined);
  await audit({ actorUid: uid, actorRole: "user", action: "reservation.move.self", targetType: "reservation", targetId: v.data.reservationId, before: { sessionId: moved.from }, after: { sessionId: v.data.targetSessionId } });
  return { ok: true };
});
