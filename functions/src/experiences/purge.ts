import { logger } from "firebase-functions/v2";
import { db } from "../lib/admin";

/**
 * SITE D'ESSAI UNIQUEMENT (appelé par le contenu de départ avec --with-demo-experiences, jamais en production) :
 * supprime définitivement les événements archivés ou retirés du programme (lot E), même s'ils ont eu des réservations,
 * avec tout ce qui s'y rattache (dates, tables, réservations, paiements, factures, avis, demandes, listes d'attente…).
 * Les comptes du site d'essai sont fictifs : on ne garde que le programme actuel, propre.
 */

const chunks = <T>(a: T[], n = 30) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function deleteWhere(collection: string, field: string, values: string[]): Promise<{ count: number; ids: string[] }> {
  const ids: string[] = [];
  for (const part of chunks([...new Set(values)])) {
    const snap = await db.collection(collection).where(field, "in", part).get();
    for (const d of snap.docs) {
      ids.push(d.id);
      await db.recursiveDelete(d.ref);
    }
  }
  return { count: ids.length, ids };
}

export type PurgeResult = { experiences: number; sessions: number; reservations: number; payments: number; invoices: number; reviews: number; other: number };

export async function purgeRetiredExperiences(): Promise<PurgeResult> {
  const r: PurgeResult = { experiences: 0, sessions: 0, reservations: 0, payments: 0, invoices: 0, reviews: 0, other: 0 };
  const archived = (await db.collection("experiences").where("status", "==", "archived").get()).docs;
  const retiring = (await db.collection("experiences").where("retiring", "==", true).get()).docs;
  const exps = [...new Map([...archived, ...retiring].map((d) => [d.id, d])).values()];
  if (!exps.length) return r;
  const expIds = exps.map((d) => d.id);

  const sessionIds: string[] = [];
  for (const part of chunks(expIds)) sessionIds.push(...(await db.collection("sessions").where("experienceId", "in", part).get()).docs.map((d) => d.id));
  const reservationIds: string[] = [];
  for (const part of chunks(expIds)) reservationIds.push(...(await db.collection("reservations").where("experienceId", "in", part).get()).docs.map((d) => d.id));

  // Paiements et factures des réservations supprimées.
  const payments = reservationIds.length ? await deleteWhere("payments", "reservationId", reservationIds) : { count: 0, ids: [] };
  r.payments = payments.count;
  r.invoices = reservationIds.length ? (await deleteWhere("invoices", "reservationId", reservationIds)).count : 0;
  // Ce qui dépend des dates.
  if (sessionIds.length) {
    for (const c of ["groups", "venueRequests", "invitations", "reports"]) r.other += (await deleteWhere(c, "sessionId", sessionIds)).count;
  }
  // Ce qui dépend des événements.
  r.reviews = (await deleteWhere("reviews", "experienceId", expIds)).count;
  for (const c of ["bookingRequests", "experienceAlerts", "organizerRequests"]) r.other += (await deleteWhere(c, "experienceId", expIds)).count;
  r.reservations = (await deleteWhere("reservations", "experienceId", expIds)).count;
  r.sessions = (await deleteWhere("sessions", "experienceId", expIds)).count;
  for (const d of exps) await db.recursiveDelete(d.ref);
  r.experiences = exps.length;
  logger.info("Événements archivés supprimés (site d'essai)", r);
  return r;
}
