import { bookingClosesAt, bookingWindow, windowRefusal, type WindowState } from "@thecommunity/shared";
import { Timestamp, type DocumentData, type Transaction } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import { memberFromDoc } from "../membership/state";
import { refuse } from "../reservations/refuse";

/**
 * docs/25 (validé le 24/11) — fenêtre de réservation d'un rendez-vous : une seule date ouverte, deux pour les abonnés
 * Pass. Lecture dans la transaction (à appeler avant toute écriture). Sans effet hors rendez-vous.
 */
export async function windowStateFor(tx: Transaction, experienceId: string, sessionId: string, e: DocumentData, now: number): Promise<WindowState | undefined> {
  const up = await tx.get(db.collection("sessions").where("experienceId", "==", experienceId).where("startAt", ">", Timestamp.fromMillis(now)).orderBy("startAt").limit(4));
  const list = up.docs.filter((d) => ["published", "full"].includes(String(d.get("status")))).map((d) => ({ id: d.id, startAt: (d.get("startAt") as Timestamp).toDate() }));
  return bookingWindow(list, e, new Date(now), bookingClosesAt).get(sessionId);
}

export async function requireWindowOpen(tx: Transaction, o: { experienceId: string; sessionId: string; e: DocumentData; membership: DocumentData | undefined; now: number }) {
  if (!o.e.rendezvousId) return;
  const w = await windowStateFor(tx, o.experienceId, o.sessionId, o.e, o.now);
  if (windowRefusal(w, memberFromDoc(o.membership, new Date(o.now)))) {
    refuse("not_yet_open", "Cette date ouvre à la fermeture de la précédente.");
  }
}
