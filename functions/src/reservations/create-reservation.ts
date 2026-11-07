import { bookingClosesAt, bookingRefusal, HOLD_MINUTES, reservationRequestSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { membershipRef, membershipTerms, planRef } from "../membership/state";
import { reservationDoc } from "./reservation-doc";

import { refuse } from "./refuse";
export { refuse };

/**
 * Réserve des places (docs/06 §2). Dans UNE transaction Firestore :
 * lecture de la session et du verrou de l'utilisateur, vérification des places, puis
 * seatsHeld += n, verrou seatLocks/{uid} et réservation « pending_payment » valable 15 minutes.
 * Garanties : pas de surréservation, une seule réservation active par personne et par date,
 * prix calculé uniquement ici. Une réservation gratuite est confirmée immédiatement.
 */
export const createReservation = onCall({ region: REGION }, async (req) => {
  const { uid, token } = requireAuth(req);
  return reserveSeats({ uid, emailVerified: token.email_verified === true }, req.data);
});

/** Cœur de la réservation (séparé de la callable pour être testé sous forte concurrence). */
export async function reserveSeats(caller: { uid: string; emailVerified: boolean }, data: unknown) {
  const { uid } = caller;
  if (!caller.emailVerified) refuse("email_not_verified", "Confirmez votre adresse e-mail pour réserver.");
  const parsed = reservationRequestSchema.safeParse(data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, seats } = parsed.data;

  await requireMemberReady(uid);
  return runReservation({ uid, sessionId, seats });
}

/** Compte actif et questionnaire complété (conditions pour réserver ou demander à participer). */
export async function requireMemberReady(uid: string) {
  const user = (await db.doc(`users/${uid}`).get()).data();
  if (user?.status === "suspended") throw new HttpsError("permission-denied", "Compte suspendu.", { reason: "suspended" });
  if (user?.onboardingCompleted !== true) refuse("profile_incomplete", "Complétez votre profil pour réserver.");
}

/**
 * La transaction de réservation. Deux chemins :
 * - réservation directe (expérience « direct ») : blocage de 15 minutes ;
 * - acceptation d'une demande par l'équipe (`requestId`) : la demande passe à « accepted » dans la MÊME
 *   transaction et la personne a 24 h pour payer (jamais au-delà de la fermeture des réservations).
 */
export async function runReservation(o: ReservationRun) {
  // Très forte affluence sur une même date : Firestore peut abandonner une transaction après ses propres
  // essais (ABORTED). On relance alors quelques fois, avec une attente aléatoire, plutôt que d'afficher
  // « réessayez » : la personne obtient une vraie réponse (place ou « complet »).
  for (let attempt = 1; ; attempt++) {
    try {
      return await runReservationOnce(o);
    } catch (e) {
      const code = (e as { code?: unknown }).code;
      if ((code === 10 || code === "aborted") && attempt < 4) {
        await new Promise((r) => setTimeout(r, 50 + Math.random() * 250 * attempt));
        continue;
      }
      throw e;
    }
  }
}

type ReservationRun = { uid: string; sessionId: string; seats: number; requestId?: string; holdMs?: number; actorUid?: string };

async function runReservationOnce(o: ReservationRun) {
  const { uid, sessionId, seats } = o;
  const sessRef = db.doc(`sessions/${sessionId}`);
  const lockRef = sessRef.collection("seatLocks").doc(uid);
  const requestRef = o.requestId ? db.doc(`bookingRequests/${o.requestId}`) : null;

  return db.runTransaction(async (tx) => {
    const [sess, lock, request, wait, planSnap, memSnap] = await Promise.all([
      tx.get(sessRef),
      tx.get(lockRef),
      requestRef ? tx.get(requestRef) : Promise.resolve(null),
      tx.get(sessRef.collection("waitlist").doc(uid)),
      tx.get(planRef()),
      tx.get(membershipRef(uid)),
    ]);
    if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    const s = sess.data()!;
    const exp = await tx.get(db.doc(`experiences/${s.experienceId}`));
    if (!exp.exists || exp.data()?.status !== "published") refuse("not_open", "Cette expérience n'est pas ouverte à la réservation.");
    const e = exp.data()!;
    const now = Date.now();
    if (!requestRef && e.admission === "on_request") refuse("approval_required", "Cette expérience est sur demande.");
    const terms = membershipTerms({ plan: planSnap.data(), membership: memSnap.data(), s, e, now, byTeam: Boolean(requestRef) });
    if (request) {
      const r = request.data();
      if (!r || r.status !== "pending" || r.userId !== uid || r.sessionId !== sessionId) refuse("request_not_pending", "Cette demande a déjà été traitée.");
    }

    // Réservation déjà en cours pour cette date ?
    let releasedHold = 0;
    if (lock.exists) {
      const prevRef = db.doc(`reservations/${lock.data()!.reservationId}`);
      const prev = await tx.get(prevRef);
      const p = prev.data();
      if (!requestRef && p?.status === "pending_payment" && (p.holdExpiresAt as Timestamp).toMillis() > now) {
        // Même personne, paiement pas encore fait : on reprend la réservation existante.
        return { reservationId: prev.id, status: "pending_payment", resumed: true, total: p.pricing.total };
      }
      if (p?.status === "confirmed" || p?.status === "attended" || (requestRef && p?.status === "pending_payment" && (p.holdExpiresAt as Timestamp).toMillis() > now)) {
        refuse("already_booked", "Une place est déjà réservée pour cette date.");
      }
      if (p?.status === "pending_payment") {
        // Blocage dépassé mais pas encore libéré par la tâche planifiée : on le libère ici.
        tx.update(prevRef, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
        releasedHold = p.seats as number;
      }
    }

    const view = {
      status: s.status as string,
      startAt: (s.startAt as Timestamp).toDate(),
      capacity: s.capacity as number,
      seatsConfirmed: s.seatsConfirmed as number,
      seatsHeld: (s.seatsHeld as number) - releasedHold,
    };
    const refusal = bookingRefusal(view, { bookingMode: e.bookingMode, maxSeatsPerBooking: e.maxSeatsPerBooking }, seats, new Date(now));
    if (refusal) refuse(refusal, "Réservation impossible pour cette date.");

    const resRef = db.collection("reservations").doc();
    const { doc, pricing, free } = reservationDoc({
      s,
      e,
      uid,
      sessionId,
      seats,
      holdUntilMs: Math.min(now + (o.holdMs ?? HOLD_MINUTES * 60_000), bookingClosesAt(view.startAt, e.bookingMode).getTime()),
      memberUnitAmount: terms.memberUnitAmount,
      extra: requestRef ? { requestId: requestRef.id } : undefined,
    });
    tx.set(resRef, doc);
    // Inscrit(e) sur la liste d'attente de cette date ? Sa réservation directe l'en retire.
    if (wait?.exists && wait.data()?.status === "waiting") {
      tx.update(wait.ref, { status: "converted", reservationId: resRef.id, updatedAt: FieldValue.serverTimestamp() });
    }
    const heldAfter = view.seatsHeld + (free ? 0 : seats);
    const confirmedAfter = view.seatsConfirmed + (free ? seats : 0);
    tx.update(sessRef, {
      seatsHeld: FieldValue.increment((free ? 0 : seats) - releasedHold),
      seatsConfirmed: FieldValue.increment(free ? seats : 0),
      ...(wait?.exists && wait.data()?.status === "waiting" ? { waitlistCount: FieldValue.increment(-1) } : {}),
      status: view.capacity - confirmedAfter - heldAfter <= 0 ? "full" : "published",
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(lockRef, { reservationId: resRef.id, createdAt: FieldValue.serverTimestamp() });
    if (requestRef) {
      tx.update(requestRef, {
        status: "accepted",
        reservationId: resRef.id,
        decidedAt: FieldValue.serverTimestamp(),
        decidedBy: o.actorUid ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { reservationId: resRef.id, status: free ? "confirmed" : "pending_payment", resumed: false, total: pricing.total };
  }, { maxAttempts: 10 }); // forte affluence sur une même date : on réessaie davantage avant d'abandonner
}
