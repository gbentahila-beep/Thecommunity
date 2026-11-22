import { assignGroupsToVenues, byTableLabel, parseCoords, sessionVenueActionSchema, sessionVenuesInputSchema, type SessionVenue } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { notifyReservationChange } from "../notify/reminders";
import { refuse } from "../reservations/refuse";

const TEAM = ["admin", "superadmin"] as const;

export type RevealedVenue = { name: string; address: string; cuisine?: string };

/**
 * Lieux d'une date à lieu secret (docs/22, décision 15) : ceux renseignés pour la date, sinon le lieu habituel du
 * rendez-vous (document privé de l'expérience ; anciens documents : la fiche).
 */
export async function sessionVenues(sessionId: string, experienceId: string, e: DocumentData): Promise<{ venues: SessionVenue[]; cuisine: string }> {
  const [own, hidden] = await Promise.all([db.doc(`sessions/${sessionId}/private/venues`).get(), db.doc(`experiences/${experienceId}/private/venue`).get()]);
  const h = hidden.data();
  const cuisine = String(h?.cuisine || e.cuisine || "");
  const list = (own.data()?.venues ?? []) as SessionVenue[];
  if (list.length > 0) return { venues: list, cuisine };
  const name = String(h?.name || e.venue?.name || "");
  const address = String(h?.address || e.venue?.address || "");
  return { venues: name || address ? [{ name, address, geo: h?.geo ?? null }] : [], cuisine };
}

/** Lieu de chaque table : les tables (Table 1, Table 2…) remplissent les lieux dans l'ordre (voir assignGroupsToVenues). */
export function venueByGroup(groups: { id: string; label: string }[], venues: SessionVenue[], cuisine: string): Map<string, RevealedVenue> {
  const sorted = [...groups].sort((a, b) => byTableLabel(a.label, b.label));
  const idx = assignGroupsToVenues(sorted.length, venues);
  return new Map(sorted.map((g, i) => {
    const v = venues[idx[i]!]!;
    return [g.id, { name: v.name, address: v.address, ...(cuisine ? { cuisine } : {}) }];
  }));
}

/**
 * Lieux d'une date (équipe) : un ou plusieurs restaurants, au plus tard 5 h avant. Peut aussi les appliquer aux
 * prochaines dates qui n'en ont pas, et en faire le lieu habituel du rendez-vous. Après la révélation, chaque
 * participant reçoit le nouveau lieu de sa table (notification et e-mail). Journalisé.
 */
export const adminSetSessionVenues = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = sessionVenuesInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const sessRef = db.doc(`sessions/${v.data.sessionId}`);
  const sess = await sessRef.get();
  if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const s = sess.data()!;
  const expRef = db.doc(`experiences/${s.experienceId}`);
  const e = (await expRef.get()).data() ?? {};
  const partnerIds = [...new Set(v.data.venues.map((x) => x.partnerId).filter(Boolean))] as string[];
  const partners = new Map((partnerIds.length ? await db.getAll(...partnerIds.map((id) => db.doc(`partners/${id}`))) : []).map((p) => [p.id, p]));
  if (partnerIds.some((id) => !partners.get(id)?.exists)) invalidArgument([{ path: ["venues"], message: "required" }]);
  const venues: SessionVenue[] = v.data.venues.map((x) => ({
    partnerId: x.partnerId || null,
    name: x.name,
    address: x.address,
    geo: parseCoords(x.coords),
    tables: x.tables ?? null,
    rating: null,
  }));
  const batch = db.batch();
  batch.set(db.doc(`sessions/${sessRef.id}/private/venues`), { venues, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  let applied = 0;
  if (v.data.applyToFuture && venues.length > 0) {
    const future = await db.collection("sessions").where("experienceId", "==", s.experienceId).where("startAt", ">", s.startAt as Timestamp).get();
    const own = future.docs.length ? await db.getAll(...future.docs.map((d) => db.doc(`sessions/${d.id}/private/venues`))) : [];
    future.docs.forEach((d, i) => {
      if (d.data().status === "cancelled" || (own[i]?.data()?.venues ?? []).length > 0) return;
      batch.set(db.doc(`sessions/${d.id}/private/venues`), { venues, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
      applied++;
    });
  }
  if (v.data.makeDefault && venues[0]) batch.set(db.doc(`experiences/${s.experienceId}/private/venue`), defaultVenueDoc(venues[0], partners.get(venues[0].partnerId ?? "")?.data()?.name), { merge: true });
  await batch.commit();
  const updated = s.groupsStatus === "revealed" && e.venue?.revealPolicy === "on_group_reveal" && venues.length > 0 ? await refreshRevealed(sessRef.id, s.experienceId, e) : 0;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "session.venues", targetType: "session", targetId: sessRef.id, after: { venues: venues.map((x) => x.name), applied, makeDefault: v.data.makeDefault, updated } });
  return { ok: true, applied, updated };
});

/** Après une date : noter un lieu (« bien » / « à revoir ») ou en faire le lieu habituel du rendez-vous. Journalisé. */
export const adminSessionVenueAction = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = sessionVenueActionSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const sess = await db.doc(`sessions/${v.data.sessionId}`).get();
  if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const ref = db.doc(`sessions/${sess.id}/private/venues`);
  const venues = ((await ref.get()).data()?.venues ?? []) as SessionVenue[];
  const venue = venues[v.data.index];
  if (!venue) refuse("venue_missing", "Lieu introuvable pour cette date.");
  if (v.data.action === "rate") {
    if (!v.data.rating) invalidArgument([{ path: ["rating"], message: "required" }]);
    venues[v.data.index] = { ...venue!, rating: v.data.rating };
    await ref.set({ venues, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid }, { merge: true });
  } else {
    const partnerName = venue!.partnerId ? (await db.doc(`partners/${venue!.partnerId}`).get()).data()?.name : undefined;
    await db.doc(`experiences/${sess.data()!.experienceId}/private/venue`).set(defaultVenueDoc(venue!, partnerName), { merge: true });
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: v.data.action === "rate" ? "session.venue.rate" : "experience.venue.default", targetType: "session", targetId: sess.id, after: { venue: venue!.name, rating: v.data.rating ?? null } });
  return { ok: true };
});

function defaultVenueDoc(v: SessionVenue, partnerName?: unknown) {
  return { name: v.name, address: v.address, geo: v.geo ?? null, partnerName: partnerName ? String(partnerName) : "", updatedAt: FieldValue.serverTimestamp() };
}

/** Lieux déjà révélés : chaque participant reçoit le lieu de sa table s'il a changé. Renvoie le nombre de personnes prévenues. */
export async function refreshRevealed(sessionId: string, experienceId: string, e: DocumentData): Promise<number> {
  const { venues, cuisine } = await sessionVenues(sessionId, experienceId, e);
  const groups = await db.collection("groups").where("sessionId", "==", sessionId).get();
  const byGroup = venueByGroup(groups.docs.map((g) => ({ id: g.id, label: String(g.data().label ?? "") })), venues, cuisine);
  const res = await db.collection("reservations").where("sessionId", "==", sessionId).get();
  let n = 0;
  for (const r of res.docs) {
    const d = r.data();
    const next = d.groupId ? byGroup.get(d.groupId) : undefined;
    if (d.status !== "confirmed" || !next || (d.venue?.name === next.name && d.venue?.address === next.address)) continue;
    await r.ref.update({ venue: next, updatedAt: FieldValue.serverTimestamp() });
    await notifyReservationChange(r.id, "venue").catch(() => undefined);
    n++;
  }
  return n;
}
