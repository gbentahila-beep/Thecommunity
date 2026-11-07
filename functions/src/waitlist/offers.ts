import { bookingClosesAt, memberUnitPrice, WAITLIST_OFFER_HOURS } from "@thecommunity/shared";
import { Timestamp, type DocumentData, type DocumentReference, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";
import { memberFromDoc, membershipRef, planRef } from "../membership/state";
import { reservationDoc } from "../reservations/reservation-doc";

export type WaitlistCandidates = { entries: QueryDocumentSnapshot[]; locked: Set<string>; plan: DocumentData | undefined; memberships: Map<string, DocumentData | undefined> };

/**
 * LECTURES (à faire avant toute écriture de la transaction) : les premières personnes en attente
 * sur cette date, dans l'ordre d'inscription, et leurs éventuels verrous de réservation.
 */
export async function readWaitlist(tx: Transaction, sessRef: DocumentReference): Promise<WaitlistCandidates> {
  const q = await tx.get(sessRef.collection("waitlist").where("status", "==", "waiting").orderBy("createdAt").limit(20));
  const [locks, mems, plan] = await Promise.all([
    Promise.all(q.docs.map((d) => tx.get(sessRef.collection("seatLocks").doc(d.id)))),
    Promise.all(q.docs.map((d) => tx.get(membershipRef(d.id)))),
    tx.get(planRef()),
  ]);
  return {
    entries: q.docs,
    locked: new Set(locks.filter((l) => l.exists).map((l) => l.id)),
    plan: plan.data(),
    memberships: new Map(mems.map((m) => [m.id, m.data()])),
  };
}

const OFFER_NOTE = {
  title: { fr: "Une place s'est libérée pour vous", ar: "تحرر مكان من أجلك" },
  freeBody: { fr: "Vous étiez sur la liste d'attente : la place est à vous.", ar: "كنت على قائمة الانتظار: المكان أصبح لك." },
  body: {
    fr: `Vous étiez sur la liste d'attente : la place vous est réservée pendant ${WAITLIST_OFFER_HOURS} h. Payez pour la confirmer.`,
    ar: `كنت على قائمة الانتظار: المكان محجوز لك لمدة ${WAITLIST_OFFER_HOURS} ساعات. ادفع لتأكيده.`,
  },
};

/**
 * ÉCRITURES : propose les places libérées aux personnes en attente, dans l'ordre (une demande trop
 * grande pour les places restantes est sautée, pas perdue). Chaque offre est une réservation
 * « pending_payment » réservée pendant 4 h, avec notification. Rien si les réservations sont fermées.
 * Renvoie les variations à appliquer à la session (dans la même mise à jour que la libération).
 */
export function writeOffers(
  tx: Transaction,
  o: { sessRef: DocumentReference; s: DocumentData; e: DocumentData; candidates: WaitlistCandidates; available: number; now: number },
): { heldDelta: number; confirmedDelta: number; waitingDelta: number; offered: string[] } {
  const out = { heldDelta: 0, confirmedDelta: 0, waitingDelta: 0, offered: [] as string[] };
  const closesAt = bookingClosesAt((o.s.startAt as Timestamp).toDate(), o.e.bookingMode).getTime();
  if (o.now >= closesAt || !["published", "full"].includes(o.s.status)) return out;
  let remaining = o.available;
  for (const entry of o.candidates.entries) {
    if (remaining <= 0) break;
    const w = entry.data();
    if (o.candidates.locked.has(entry.id)) {
      // Elle a déjà une place sur cette date : on la retire simplement de la liste.
      tx.update(entry.ref, { status: "converted", updatedAt: FieldValue.serverTimestamp() });
      out.waitingDelta -= 1;
      continue;
    }
    const seats = (w.seats as number) ?? 1;
    if (seats > remaining) continue;
    // Prix membre pour une personne abonnée (l'accès anticipé ne s'applique pas : elle attendait déjà).
    const member = memberFromDoc(o.candidates.memberships.get(entry.id), new Date(o.now));
    if (o.e.membersOnly === true && !member) continue;
    const memberUnitAmount = member
      ? memberUnitPrice(o.s.price.amount, { discountPercent: Number(o.candidates.plan?.discountPercent ?? 0) }, o.e.memberPrice?.amount ?? null)
      : undefined;
    const resRef = db.collection("reservations").doc();
    const { doc, free } = reservationDoc({
      s: o.s,
      e: o.e,
      uid: entry.id,
      sessionId: o.sessRef.id,
      seats,
      holdUntilMs: Math.min(o.now + WAITLIST_OFFER_HOURS * 3_600_000, closesAt),
      memberUnitAmount,
      extra: { fromWaitlist: true },
    });
    tx.set(resRef, doc);
    tx.set(o.sessRef.collection("seatLocks").doc(entry.id), { reservationId: resRef.id, createdAt: FieldValue.serverTimestamp() });
    tx.update(entry.ref, {
      status: free ? "converted" : "offered",
      reservationId: resRef.id,
      offerExpiresAt: doc.holdExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection(`users/${entry.id}/notifications`).doc(), {
      type: "waitlist_offer",
      title: OFFER_NOTE.title,
      body: free ? OFFER_NOTE.freeBody : OFFER_NOTE.body,
      link: `/espace/reservations/${resRef.id}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (free) out.confirmedDelta += seats;
    else out.heldDelta += seats;
    out.waitingDelta -= 1;
    out.offered.push(entry.id);
    remaining -= seats;
  }
  return out;
}
