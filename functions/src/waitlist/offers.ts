import { bookingClosesAt, PASS_MAX_UPCOMING, readServiceFee, WAITLIST_OFFER_HOURS, wenzyPriceOf, type ServiceFee } from "@thecommunity/shared";
import { Timestamp, type DocumentData, type DocumentReference, type QueryDocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";
import { memberFromDoc, membershipRef, passCoversEvent, passUpcoming, planRef } from "../membership/state";
import { reservationDoc } from "../reservations/reservation-doc";

export type WaitlistCandidates = { entries: QueryDocumentSnapshot[]; locked: Set<string>; plan: DocumentData | undefined; memberships: Map<string, DocumentData | undefined>; passUpcoming: Map<string, number>; serviceFee: ServiceFee; wenzyPrice: number };

/**
 * LECTURES (à faire avant toute écriture de la transaction) : les premières personnes en attente
 * sur cette date, dans l'ordre d'inscription, et leurs éventuels verrous de réservation.
 */
export async function readWaitlist(tx: Transaction, sessRef: DocumentReference): Promise<WaitlistCandidates> {
  const q = await tx.get(sessRef.collection("waitlist").where("status", "==", "waiting").orderBy("createdAt").limit(20));
  const [locks, mems, plan, booking] = await Promise.all([
    Promise.all(q.docs.map((d) => tx.get(sessRef.collection("seatLocks").doc(d.id)))),
    Promise.all(q.docs.map((d) => tx.get(membershipRef(d.id)))),
    tx.get(planRef()),
    tx.get(db.doc("settings/booking")),
  ]);
  const memberships = new Map(mems.map((m) => [m.id, m.data()]));
  // Audit 23/11 : la limite de 2 réservations à venir couvertes par le pass vaut aussi pour les places proposées.
  const now = Date.now();
  const upcoming = new Map<string, number>();
  for (const m of mems) if (memberFromDoc(m.data())) upcoming.set(m.id, await passUpcoming(m.id, now, tx));
  // docs/22 § 17.I : priorité aux personnes qui ont un pass, puis ordre d'inscription.
  const entries = [...q.docs].sort((a, b) => Number(memberFromDoc(memberships.get(b.id))) - Number(memberFromDoc(memberships.get(a.id))));
  return {
    entries,
    locked: new Set(locks.filter((l) => l.exists).map((l) => l.id)),
    plan: plan.data(),
    memberships,
    passUpcoming: upcoming,
    serviceFee: readServiceFee(booking.data()?.serviceFee),
    wenzyPrice: wenzyPriceOf(booking.data()),
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
    // Pass : la place de la personne est incluse (l'accès anticipé ne s'applique pas : elle attendait déjà).
    const member = memberFromDoc(o.candidates.memberships.get(entry.id), new Date(o.now));
    if (o.e.membersOnly === true && !member) continue;
    // Activité physique : conditions acceptées à l'inscription sur la liste (anciennes inscriptions sans accord : sautées).
    if (o.e.physicalActivity === true && !w.physicalTerms) continue;
    const cap = Math.min(Number(o.s.price?.amount ?? 0), o.candidates.wenzyPrice);
    // Audit 23/11 : pass valable à la date de l'événement et limite de 2 réservations à venir respectée.
    const passOk = passCoversEvent(o.candidates.memberships.get(entry.id), (o.s.startAt as Timestamp).toMillis(), new Date(o.now)) && (o.candidates.passUpcoming.get(entry.id) ?? 0) < PASS_MAX_UPCOMING;
    const coverage = passOk && cap > 0 ? { passSeats: 1, carnetSeats: 0, cap } : undefined;
    const resRef = db.collection("reservations").doc();
    const { doc, free } = reservationDoc({
      s: o.s,
      e: o.e,
      uid: entry.id,
      sessionId: o.sessRef.id,
      seats,
      holdUntilMs: Math.min(o.now + WAITLIST_OFFER_HOURS * 3_600_000, closesAt),
      coverage,
      serviceFee: o.candidates.serviceFee,
      preferences: w.preferences ?? undefined,
      extra: { fromWaitlist: true, ...(w.answers ? { questionnaire: { answers: w.answers, answeredAt: Timestamp.fromMillis(o.now) } } : {}), ...(w.physicalTerms ? { physicalTerms: w.physicalTerms } : {}) },
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
