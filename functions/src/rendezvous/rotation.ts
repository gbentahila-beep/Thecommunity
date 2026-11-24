import {
  localDayAt, localDayKey, LAUNCH_ROTATION, mergeTemplates, rotationDays, rotationInputSchema, rotationPlan, rotationWeekInputSchema,
  type EventTemplate, type RotationEntry, type RotationOverride,
} from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { sessionDocFor } from "../experiences/add-sessions";

/**
 * docs/25, lot D — l'activité du samedi (rendez-vous « rotation »). Les dates sont créées `weeksAhead` semaines à
 * l'avance selon le programme (rotation + changements de l'équipe). Quand un samedi change, la date prévue est retirée
 * si personne n'est inscrit ; si des personnes sont inscrites, elle est GARDÉE (et signalée dans le back-office).
 */

const hasPeople = (s: DocumentData) => Number(s.seatsConfirmed ?? 0) + Number(s.seatsHeld ?? 0) + Number(s.waitlistCount ?? 0) > 0;

/** Expériences concernées : rotation + activités choisies pour un samedi. */
function involvedIds(cycle: RotationEntry[], overrides: Record<string, RotationOverride>): Set<string> {
  return new Set([...cycle.map((c) => c.experienceId), ...Object.values(overrides).flatMap((o) => (o.experienceId ? [o.experienceId] : []))]);
}

/** Retire une date sans inscrit : supprimée si elle n'a jamais eu de réservation, sinon annulée. */
async function dropEmpty(s: FirebaseFirestore.QueryDocumentSnapshot, reason: string): Promise<boolean> {
  if (hasPeople(s.data())) return false;
  const active = await db.collection("reservations").where("sessionId", "==", s.id).where("status", "in", ["confirmed", "pending_payment"]).limit(1).get();
  if (!active.empty) return false;
  const any = await db.collection("reservations").where("sessionId", "==", s.id).limit(1).get();
  if (any.empty) await db.recursiveDelete(s.ref);
  else await s.ref.update({ status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: "system", reason }, updatedAt: FieldValue.serverTimestamp() });
  return true;
}

/** Rattache (ou détache) les activités au rendez-vous ; les anciennes dates sans inscrit d'une activité rattachée sont retirées. */
async function syncExperiences(rvId: string, ids: Set<string>, now: Date) {
  const attached = await db.collection("experiences").where("rendezvousId", "==", rvId).get();
  for (const d of attached.docs) {
    if (ids.has(d.id)) continue;
    await d.ref.update({ rendezvousId: FieldValue.delete(), rendezvousKind: FieldValue.delete(), closeRule: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    const future = await db.collection("sessions").where("experienceId", "==", d.id).where("startAt", ">", Timestamp.fromDate(now)).get();
    for (const s of future.docs) if (s.get("rendezvousId") === rvId && s.get("status") !== "cancelled") await dropEmpty(s, "rotation_change");
  }
  for (const id of ids) {
    const ref = db.doc(`experiences/${id}`);
    const e = await ref.get();
    if (!e.exists) continue;
    if (e.get("rendezvousId") && e.get("rendezvousId") !== rvId) continue; // déjà dans un autre rendez-vous : on n'y touche pas
    if (e.get("rendezvousId") !== rvId || e.get("rendezvousKind") !== "rotation" || e.get("closeRule") !== "eve") {
      await ref.update({ rendezvousId: rvId, rendezvousKind: "rotation", closeRule: "eve", rendezvousSlot: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
      // Ses dates hors programme (d'avant la rotation) sans inscrit disparaissent ; celles qui ont des inscrits restent.
      const future = await db.collection("sessions").where("experienceId", "==", id).where("startAt", ">", Timestamp.fromDate(now)).get();
      for (const s of future.docs) if (s.get("rendezvousId") !== rvId && ["published", "full", "draft"].includes(String(s.get("status")))) await dropEmpty(s, "rotation_schedule");
    }
  }
}

/** Crée, déplace ou retire les dates pour coller au programme des `weeksAhead` prochains samedis. */
export async function ensureRotationSessions(rvId: string, now = new Date()): Promise<{ created: number; removed: number; kept: number }> {
  const out = { created: 0, removed: 0, kept: 0 };
  const rv = (await db.doc(`rendezvous/${rvId}`).get()).data();
  if (!rv || rv.kind !== "rotation" || rv.status !== "active") return out;
  const cycle = (rv.cycle ?? []) as RotationEntry[];
  const overrides = (rv.overrides ?? {}) as Record<string, RotationOverride>;
  const plan = rotationPlan({ weekday: Number(rv.weekday), anchor: String(rv.anchor), cycle, overrides }, rotationDays(Number(rv.weekday), now, Number(rv.weeksAhead ?? 6)));
  const future = (await db.collection("sessions").where("rendezvousId", "==", rvId).where("startAt", ">", Timestamp.fromDate(now)).get()).docs.filter((d) => d.get("status") !== "cancelled");
  const byDay = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const s of future) {
    const k = localDayKey((s.get("startAt") as Timestamp).toDate());
    byDay.set(k, [...(byDay.get(k) ?? []), s]);
  }
  const exps = new Map<string, DocumentData>();
  const touched = new Set<string>();
  for (const w of plan) {
    const day = byDay.get(w.date) ?? [];
    const start = w.entry ? localDayAt(w.date, w.entry.time) : null;
    if (w.entry && start && start.getTime() > now.getTime()) {
      const id = w.entry.experienceId;
      if (!exps.has(id)) exps.set(id, (await db.doc(`experiences/${id}`).get()).data() ?? {});
      const e = exps.get(id)!;
      const mine = day.find((s) => s.get("experienceId") === id);
      const end = new Date(start.getTime() + Number(e.durationMinutes ?? 120) * 60_000);
      if (mine) {
        // Heure ou places changées : la date suit tant que personne n'est inscrit (sinon elle reste telle quelle).
        const sameTime = (mine.get("startAt") as Timestamp).toMillis() === start.getTime();
        if ((!sameTime || Number(mine.get("capacity")) !== w.entry.capacity) && !hasPeople(mine.data())) {
          await mine.ref.update({ startAt: Timestamp.fromDate(start), endAt: Timestamp.fromDate(end), capacity: w.entry.capacity, updatedAt: FieldValue.serverTimestamp() });
        }
      } else if (e.status === "published") {
        await db.collection("sessions").doc().set({ ...sessionDocFor(e, id, start, end, w.entry.capacity), rendezvousId: rvId });
        out.created++;
        touched.add(id);
      } else {
        logger.warn("Activité du samedi non publiée : date non créée", { rvId, experienceId: id, date: w.date });
      }
    }
    for (const s of day) {
      if (w.entry && s.get("experienceId") === w.entry.experienceId) continue;
      if (await dropEmpty(s, "rotation_change")) {
        out.removed++;
        touched.add(String(s.get("experienceId")));
      } else out.kept++;
    }
  }
  // Prochaine date de chaque activité (tri des listes).
  for (const id of new Set([...touched, ...involvedIds(cycle, overrides)])) {
    const next = (await db.collection("sessions").where("experienceId", "==", id).where("startAt", ">", Timestamp.fromDate(now)).get()).docs
      .filter((d) => d.get("status") !== "cancelled")
      .map((d) => (d.get("startAt") as Timestamp).toMillis());
    await db.doc(`experiences/${id}`).update({ nextSessionAt: next.length ? Timestamp.fromMillis(Math.min(...next)) : null }).catch(() => undefined);
  }
  return out;
}

/** Équipe : créer ou modifier l'activité du samedi (rotation, heure et places de chaque activité). */
export const adminSaveRotation = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = rotationInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const x = v.data;
  for (const c of x.cycle) {
    const e = await db.doc(`experiences/${c.experienceId}`).get();
    if (!e.exists) throw new HttpsError("not-found", "Activité introuvable.", { reason: "not_found" });
    if (e.get("rendezvousId") && e.get("rendezvousKind") !== "rotation") invalidArgument([{ path: ["cycle"], message: "inOtherRendezvous" }]);
  }
  const id = x.id ?? `activite-${x.cityId}-${Math.random().toString(36).slice(2, 6)}`;
  const ref = db.doc(`rendezvous/${id}`);
  const before = (await ref.get()).data() ?? null;
  const overrides = (before?.overrides ?? {}) as Record<string, RotationOverride>;
  await ref.set({
    kind: "rotation",
    title: { fr: x.titleFr, ...(x.titleAr ? { ar: x.titleAr } : {}), ...(x.titleEn ? { en: x.titleEn } : {}) },
    cityId: x.cityId, weekday: x.weekday, time: x.cycle[0]!.time, anchor: x.anchor, weeksAhead: x.weeksAhead, cycle: x.cycle, tiers: [], status: x.status,
    ...(before ? {} : { overrides: {}, createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
  }, { merge: true });
  await syncExperiences(id, involvedIds(x.cycle, overrides), new Date());
  const r = await ensureRotationSessions(id);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before ? "rotation.update" : "rotation.create", targetType: "rendezvous", targetId: id, after: { cycle: x.cycle.map((c) => c.experienceId).join(" "), anchor: x.anchor, ...r } });
  return { ok: true, id, ...r };
});

/** Équipe : changer UN samedi (autre activité, proposition d'un partenaire, pas d'activité) ou revenir à la rotation. */
export const adminSetRotationWeek = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = rotationWeekInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const { id, date, override } = v.data;
  const ref = db.doc(`rendezvous/${id}`);
  const rv = (await ref.get()).data();
  if (!rv || rv.kind !== "rotation") throw new HttpsError("not-found", "Rotation introuvable.", { reason: "not_found" });
  if (localDayAt(date, "23:59").getTime() < Date.now()) invalidArgument([{ path: ["date"], message: "past" }]);
  if (new Date(`${date}T12:00:00Z`).getUTCDay() !== Number(rv.weekday)) invalidArgument([{ path: ["date"], message: "weekday" }]);
  if (override?.experienceId) {
    const e = await db.doc(`experiences/${override.experienceId}`).get();
    if (!e.exists || e.get("status") !== "published") invalidArgument([{ path: ["override", "experienceId"], message: "notPublished" }]);
    if (e.get("rendezvousId") && e.get("rendezvousId") !== id) invalidArgument([{ path: ["override", "experienceId"], message: "inOtherRendezvous" }]);
  }
  const overrides = { ...((rv.overrides ?? {}) as Record<string, RotationOverride>) };
  if (override) overrides[date] = { experienceId: override.experienceId, ...(override.time ? { time: override.time } : {}), ...(override.capacity ? { capacity: override.capacity } : {}), shift: override.shift, ...(override.note ? { note: override.note } : {}) };
  else delete overrides[date];
  await ref.update({ overrides, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await syncExperiences(id, involvedIds((rv.cycle ?? []) as RotationEntry[], overrides), new Date());
  const r = await ensureRotationSessions(id);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "rotation.week", targetType: "rendezvous", targetId: id, after: { date, experienceId: override ? override.experienceId ?? "none" : "rotation", shift: override?.shift ?? false, ...r } });
  return { ok: true, ...r };
});

/**
 * Lancement (lot D) : crée l'activité du samedi d'une ville si elle n'en a pas, avec les activités publiées issues des
 * modèles running, céramique, padel, yoga, escape game (dans cet ordre ; celles qui n'existent pas sont ignorées).
 */
export async function ensureLaunchRotation(actor: { uid: string }, cityId = "casablanca", now = new Date()): Promise<{ id: string; created: boolean; cycle: string[] } | null> {
  const existing = (await db.collection("rendezvous").where("cityId", "==", cityId).where("kind", "==", "rotation").limit(1).get()).docs[0];
  if (existing) return { id: existing.id, created: false, cycle: ((existing.get("cycle") ?? []) as RotationEntry[]).map((c) => c.experienceId) };
  const saved = (await db.collection("eventTemplates").get()).docs.map((d) => ({ ...(d.data() as Omit<EventTemplate, "id">), id: d.id }) as EventTemplate);
  const templates = new Map(mergeTemplates(saved).map((t) => [t.id, t]));
  const cycle: RotationEntry[] = [];
  for (const tid of LAUNCH_ROTATION.templates) {
    const e = (await db.collection("experiences").where("templateId", "==", tid).where("status", "==", "published").get()).docs
      .find((d) => d.get("cityId") === cityId && (!d.get("rendezvousId") || d.get("rendezvousKind") === "rotation"));
    const t = templates.get(tid);
    if (e) cycle.push({ experienceId: e.id, time: t ? t.values.time : "10:00", capacity: t ? t.values.capacity : 12 });
  }
  if (!cycle.length) return null;
  const id = cityId === "casablanca" ? LAUNCH_ROTATION.id : `${LAUNCH_ROTATION.id}-${cityId}`;
  const anchor = rotationDays(LAUNCH_ROTATION.weekday, now, 1)[0]!;
  await db.doc(`rendezvous/${id}`).set({
    kind: "rotation", title: LAUNCH_ROTATION.title, cityId, weekday: LAUNCH_ROTATION.weekday, time: cycle[0]!.time, anchor, weeksAhead: 6, cycle, overrides: {}, tiers: [],
    status: "active", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
  });
  await syncExperiences(id, new Set(cycle.map((c) => c.experienceId)), now);
  await ensureRotationSessions(id, now);
  return { id, created: true, cycle: cycle.map((c) => c.experienceId) };
}
