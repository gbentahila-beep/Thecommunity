import { isCalendarTemplate, LAUNCH_RENDEZVOUS, mergeTemplates, nextWeekdayDate, templateExperienceInput, type EventTemplate, type RendezvousFrequency, type VenueTier } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { requireRole } from "../lib/guards";
import { saveExperience } from "../experiences/save-experience";
import { ensureSessionsFor, retireOffScheduleDates, tierExperience } from "./rendezvous";

/**
 * docs/25, lot E — la bascule vers les rendez-vous de la semaine.
 * 1. Les rendez-vous du lancement (Dîner du mercredi, Café du samedi, Brunch du dimanche) sont créés : chaque gamme
 *    reprend l'événement existant de ce modèle et de cette gamme (ses avis, ses réservations), sinon il est créé.
 * 2. Les événements issus des modèles qui ne font plus partie du calendrier (Tables hors rendez-vous, Café et Brunch
 *    Exclusive, Déjeuner, formats « pour plus tard ») sont retirés : leurs dates à venir sans inscrit disparaissent,
 *    celles qui ont des inscrits sont HONORÉES ; l'événement est archivé dès qu'il n'a plus de date à venir.
 * Les événements créés à la main par l'équipe (sans modèle) et les activités du calendrier ne sont pas touchés.
 * Rejouable sans risque : un rendez-vous déjà là est gardé tel quel.
 */

export type LaunchResult = {
  rendezvous: { id: string; created: boolean; tiers: { tier: VenueTier; experienceId: string; reused: boolean }[]; sessions: number }[];
  retired: { experienceId: string; title: string; archived: boolean; keptDates: number }[];
  skipped: { id: string; reason: "unknown_template" }[];
  rotation?: { id: string; created: boolean; cycle: string[] } | null;
};

const hasPeople = (s: FirebaseFirestore.DocumentData) => Number(s.seatsConfirmed ?? 0) + Number(s.seatsHeld ?? 0) + Number(s.waitlistCount ?? 0) > 0;

async function templatesById(): Promise<Map<string, EventTemplate>> {
  const saved = (await db.collection("eventTemplates").get()).docs.map((d) => ({ ...(d.data() as Omit<EventTemplate, "id">), id: d.id }) as EventTemplate);
  return new Map(mergeTemplates(saved).map((t) => [t.id, t]));
}

/**
 * Retire un événement du programme : dates à venir sans inscrit annulées (supprimées si elles n'ont jamais eu de
 * réservation), dates avec inscrits gardées. Archivé tout de suite s'il ne reste rien, sinon marqué `retiring` et
 * archivé par la tâche de nuit après sa dernière date.
 */
export async function retireExperience(id: string, actor: { uid: string }, now: number): Promise<{ archived: boolean; keptDates: number }> {
  const ref = db.doc(`experiences/${id}`);
  const sessions = await db.collection("sessions").where("experienceId", "==", id).where("startAt", ">=", Timestamp.fromMillis(now)).get();
  let kept = 0;
  for (const s of sessions.docs) {
    const d = s.data();
    if (d.status === "cancelled") continue;
    const active = await db.collection("reservations").where("sessionId", "==", s.id).where("status", "in", ["confirmed", "pending_payment"]).limit(1).get();
    if (hasPeople(d) || !active.empty) {
      kept++;
      continue;
    }
    const any = await db.collection("reservations").where("sessionId", "==", s.id).limit(1).get();
    if (any.empty) await db.recursiveDelete(s.ref);
    else await s.ref.update({ status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: actor.uid, reason: "rendezvous_launch" }, updatedAt: FieldValue.serverTimestamp() });
  }
  if (kept === 0) {
    await ref.update({ status: "archived", archivedAt: FieldValue.serverTimestamp(), archivedBy: actor.uid, nextSessionAt: null, retiring: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
    return { archived: true, keptDates: 0 };
  }
  await ref.update({ retiring: true, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  return { archived: false, keptDates: kept };
}

/** Chaque nuit : un événement retiré du programme est archivé quand sa dernière date honorée est passée. */
export async function archiveRetiredExperiences(now = Date.now()): Promise<number> {
  const snap = await db.collection("experiences").where("retiring", "==", true).get();
  let n = 0;
  for (const d of snap.docs) {
    const next = await db.collection("sessions").where("experienceId", "==", d.id).where("startAt", ">=", Timestamp.fromMillis(now)).get();
    if (next.docs.some((s) => s.get("status") !== "cancelled")) continue;
    await d.ref.update({ status: "archived", archivedAt: FieldValue.serverTimestamp(), archivedBy: "system", nextSessionAt: null, retiring: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
    n++;
  }
  return n;
}

export async function launchRendezvousCore(actor: { uid: string; role: string }, now = Date.now(), cityId = "casablanca"): Promise<LaunchResult> {
  const templates = await templatesById();
  const r: LaunchResult = { rendezvous: [], retired: [], skipped: [] };
  const inRendezvous = new Set<string>();
  // Un rendez-vous déjà créé à la main au même jour et à la même heure compte comme celui du lancement.
  const others = (await db.collection("rendezvous").where("cityId", "==", cityId).get()).docs;

  for (const l of LAUNCH_RENDEZVOUS) {
    const t = templates.get(l.templateId);
    if (!t) {
      r.skipped.push({ id: l.id, reason: "unknown_template" });
      continue;
    }
    // Casablanca garde l'identifiant lisible ; une autre ville le suffixe (un rendez-vous par ville).
    const rvId = cityId === "casablanca" ? l.id : `${l.id}-${cityId}`;
    const rvRef = db.doc(`rendezvous/${rvId}`);
    const existing = others.find((d) => d.id === rvId || (Number(d.get("weekday")) === l.weekday && d.get("time") === l.time));
    if (existing) {
      for (const x of (existing.get("tiers") ?? []) as { experienceId: string }[]) inRendezvous.add(x.experienceId);
      r.rendezvous.push({ id: existing.id, created: false, tiers: [], sessions: await ensureSessionsFor(existing.id, new Date(now)) });
      continue;
    }
    const slot = { weekday: l.weekday, time: l.time };
    const used = new Set<string>();
    const tiers: { tier: VenueTier; experienceId: string; frequency: RendezvousFrequency }[] = [];
    const report: LaunchResult["rendezvous"][number]["tiers"] = [];
    // Événements de ce modèle dans la ville, pas encore dans un rendez-vous : publiés d'abord.
    const candidates = (await db.collection("experiences").where("templateId", "==", t.id).get()).docs
      .filter((d) => d.get("cityId") === cityId && ["published", "draft"].includes(String(d.get("status"))) && !d.get("rendezvousId"))
      .sort((a, b) => Number(b.get("status") === "published") - Number(a.get("status") === "published"));
    for (const x of l.tiers) {
      let base = candidates.find((d) => d.get("venueTier") === x.tier && !used.has(d.id));
      const reused = Boolean(base);
      if (!base) {
        const data = templateExperienceInput(t, { tier: x.tier, firstDate: nextWeekdayDate(l.weekday, new Date(now)), weeks: 1, cityId, venue: null });
        const res = await saveExperience({ data, addSessions: false, images: [{ path: t.image, alt: t.name }] }, { uid: actor.uid, role: actor.role, organizer: null });
        base = (await db.doc(`experiences/${res.experienceId}`).get()) as FirebaseFirestore.QueryDocumentSnapshot;
      }
      const experienceId = await tierExperience(rvId, base, x.tier, used, slot);
      await db.doc(`experiences/${experienceId}`).update({ status: "published", retiring: FieldValue.delete() });
      tiers.push({ tier: x.tier, experienceId, frequency: x.frequency });
      report.push({ tier: x.tier, experienceId, reused });
      inRendezvous.add(experienceId);
    }
    await rvRef.set({
      title: l.title, cityId, weekday: l.weekday, time: l.time, capacity: l.capacity, weeksAhead: 6, tiers, status: "active",
      baseExperienceId: tiers[0]!.experienceId, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid,
    });
    for (const x of tiers) await retireOffScheduleDates(x.experienceId, l.weekday, l.time, new Date(now));
    r.rendezvous.push({ id: rvId, created: true, tiers: report, sessions: await ensureSessionsFor(rvId, new Date(now)) });
  }

  // Lot D : l'activité du samedi (rotation running, céramique, padel, yoga, escape game) si la ville n'en a pas.
  const { ensureLaunchRotation } = await import("./rotation");
  r.rotation = await ensureLaunchRotation(actor, cityId, new Date(now));

  // Retrait : événements issus d'un modèle, dans la ville, qui ne sont ni dans un rendez-vous, ni au calendrier.
  const all = await db.collection("experiences").where("status", "in", ["published", "draft"]).get();
  for (const d of all.docs) {
    const templateId = String(d.get("templateId") ?? "");
    if (!templateId || d.get("cityId") !== cityId || d.get("rendezvousId") || inRendezvous.has(d.id) || d.get("retiring")) continue;
    const t = templates.get(templateId);
    const isTables = d.get("categoryId") === "eat" || t?.values.categoryId === "eat";
    if (!isTables && t && isCalendarTemplate(t)) continue;
    const out = await retireExperience(d.id, actor, now);
    r.retired.push({ experienceId: d.id, title: String(d.get("title.fr") ?? d.id), ...out });
  }
  await audit({ actorUid: actor.uid, actorRole: actor.role, action: "rendezvous.launch", targetType: "rendezvous", targetId: "*", after: { created: r.rendezvous.filter((x) => x.created).map((x) => x.id).join(" "), retired: r.retired.length, kept: r.retired.reduce((n, x) => n + x.keptDates, 0) } });
  await db.doc("settings/showcase").set({ rendezvousLaunchAt: FieldValue.serverTimestamp() }, { merge: true });
  return r;
}

/** Site d'essai : la bascule, une seule fois (appelée par le contenu de départ). */
export async function launchRendezvousOnce(actor: { uid: string; role: string }, now = Date.now(), cityId = "casablanca"): Promise<LaunchResult | null> {
  if ((await db.doc("settings/showcase").get()).get("rendezvousLaunchAt")) return null;
  return launchRendezvousCore(actor, now, cityId);
}

/** Back-office → Rendez-vous : « Passer au calendrier de lancement ». Super-admin, confirmation « BASCULER ». */
export const adminLaunchRendezvous = onCall({ region: REGION, timeoutSeconds: 540, memory: "512MiB" }, async (req) => {
  const a = requireRole(req, ["superadmin"]);
  const data = (req.data ?? {}) as { confirm?: unknown; cityId?: unknown };
  if (data.confirm !== "BASCULER") throw new HttpsError("failed-precondition", "Tapez BASCULER pour confirmer.", { reason: "confirm_required" });
  const cityId = typeof data.cityId === "string" && /^[a-z0-9-]{2,40}$/.test(data.cityId) ? data.cityId : "casablanca";
  const city = await db.doc(`cities/${cityId}`).get();
  if (!city.exists) throw new HttpsError("not-found", "Ville introuvable.", { reason: "not_found" });
  const r = await launchRendezvousCore({ uid: a.uid, role: "superadmin" }, Date.now(), cityId);
  logger.info("Bascule vers les rendez-vous", { created: r.rendezvous.length, retired: r.retired.length });
  return r;
});
