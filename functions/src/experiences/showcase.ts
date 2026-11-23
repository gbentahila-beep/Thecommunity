import { mergeTemplates, nextWeekdayDate, scheduleFor, TIER_SCHEDULE, templateExperienceInput, VENUE_TIERS, type EventTemplate, type VenueTier } from "@thecommunity/shared";
import { getStorage } from "firebase-admin/storage";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { cancelSessionCore } from "../admin/reservations-admin";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole } from "../lib/guards";
import { saveExperience } from "./save-experience";

const TEMPLATE_ID = z.string().regex(/^[a-z0-9-]{2,40}$/);

export const showcaseInputSchema = z.object({
  /** Décision 35 : suppression définitive, confirmée au moment même en tapant le mot. */
  confirm: z.literal("SUPPRIMER"),
  tables: z.array(z.object({ templateId: TEMPLATE_ID, tier: z.enum(VENUE_TIERS) })).max(40),
  activities: z.array(TEMPLATE_ID).max(30),
  weeks: z.number().int().min(1).max(8).default(4),
  cityId: z.string().regex(/^[a-z0-9-]{2,40}$/).default("casablanca"),
});

export type ShowcaseResult = {
  cancelledSessions: number;
  refunded: number;
  deletedSessions: number;
  archived: number;
  deleted: number;
  created: { templateId: string; tier: VenueTier | null; experienceId: string; sessions: number }[];
  skipped: { templateId: string; tier: VenueTier | null; reason: "unknown_template" | "inactive_template" | "not_tables" | "not_activity" | "no_partner" | "invalid" }[];
};

const hasPeople = (s: FirebaseFirestore.DocumentData) => (s.seatsConfirmed ?? 0) + (s.seatsHeld ?? 0) + (s.waitlistCount ?? 0) > 0;

/** Étape 1 : chaque événement existant est supprimé (sans historique) ou archivé ; les dates à venir sont annulées et remboursées. */
async function clearEvents(actor: { uid: string; role: string }, now: number, r: ShowcaseResult, only?: (e: FirebaseFirestore.DocumentData, id: string) => boolean) {
  const experiences = await db.collection("experiences").get();
  for (const e of experiences.docs) {
    if (only && !only(e.data(), e.id)) continue;
    const id = e.id;
    const sessions = await db.collection("sessions").where("experienceId", "==", id).get();
    for (const s of sessions.docs) {
      const d = s.data();
      const future = (d.startAt as Timestamp).toMillis() >= now;
      if (!future || d.status === "cancelled") continue;
      const active = await db.collection("reservations").where("sessionId", "==", s.id).where("status", "in", ["confirmed", "pending_payment"]).limit(1).get();
      if (hasPeople(d) || !active.empty) {
        const c = await cancelSessionCore(s.id, actor, "Programme renouvelé par l'équipe Wenzy");
        r.cancelledSessions += 1;
        r.refunded += c.refunded;
      } else {
        const anyReservation = await db.collection("reservations").where("sessionId", "==", s.id).limit(1).get();
        if (anyReservation.empty) {
          await db.recursiveDelete(s.ref);
          r.deletedSessions += 1;
        } else {
          await s.ref.update({ status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: actor.uid, reason: "showcase_reset" } });
          r.cancelledSessions += 1;
        }
      }
    }
    const pending = await db.collection("bookingRequests").where("experienceId", "==", id).where("status", "==", "pending").get();
    for (const q of pending.docs) await q.ref.update({ status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
    const [reservations, requests, reviews] = await Promise.all([
      db.collection("reservations").where("experienceId", "==", id).limit(1).get(),
      db.collection("bookingRequests").where("experienceId", "==", id).limit(1).get(),
      db.collection("reviews").where("experienceId", "==", id).limit(1).get(),
    ]);
    if (reservations.empty && requests.empty && reviews.empty) {
      const rest = await db.collection("sessions").where("experienceId", "==", id).get();
      for (const s of rest.docs) await db.recursiveDelete(s.ref);
      const alerts = await db.collection("experienceAlerts").where("experienceId", "==", id).get();
      for (const a of alerts.docs) await a.ref.delete();
      await db.recursiveDelete(e.ref);
      // Sans bucket configuré (script du site d'essai), getStorage().bucket() lève une erreur : on l'ignore.
      try {
        await getStorage().bucket().deleteFiles({ prefix: `experiences/${id}/` });
      } catch {
        /* pas de photos à supprimer */
      }
      r.deleted += 1;
    } else if (e.data().status !== "archived") {
      await e.ref.update({ status: "archived", archivedAt: FieldValue.serverTimestamp(), archivedBy: actor.uid, nextSessionAt: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
      r.archived += 1;
    }
  }
}

/** Lieu fixe d'une activité : un lieu partenaire actif de la ville, qui accueille ce format, avec une adresse complète. */
async function venueFor(t: EventTemplate, cityId: string) {
  const partners = await db.collection("partners").where("status", "==", "active").get();
  const ok = partners.docs
    .map((p) => ({ id: p.id, ...(p.data() as { name?: string; address?: string; district?: string; cityId?: string; formats?: string[] }) }))
    .filter((p) => p.cityId === cityId && (p.formats ?? []).includes(t.id) && (p.name ?? "").trim().length >= 2 && (p.address ?? "").trim().length >= 5 && (p.district ?? "").trim().length >= 2)
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "fr"));
  const p = ok[0];
  return p ? { name: p.name!.trim(), address: p.address!.trim(), district: p.district!.trim(), partnerId: p.id } : null;
}

/** Étape 2 : nouveaux événements à partir des modèles validés (photo du modèle, quelques dates hebdomadaires). */
async function createFromTemplates(input: z.infer<typeof showcaseInputSchema>, actor: { uid: string; role: string }, now: number, r: ShowcaseResult) {
  const saved = (await db.collection("eventTemplates").get()).docs.map((d) => ({ ...(d.data() as Omit<EventTemplate, "id">), id: d.id }) as EventTemplate);
  const templates = new Map(mergeTemplates(saved).map((t) => [t.id, t]));
  // Au plus tôt dans 2 jours : les réservations des Tables ferment la veille à 18 h.
  const base = new Date(now + 2 * 86_400_000);
  const jobs: { templateId: string; tier: VenueTier | null }[] = [...input.tables.map((x) => ({ templateId: x.templateId, tier: x.tier })), ...input.activities.map((id) => ({ templateId: id, tier: null }))];
  for (const job of jobs) {
    const t = templates.get(job.templateId);
    const skip = (reason: ShowcaseResult["skipped"][number]["reason"]) => r.skipped.push({ templateId: job.templateId, tier: job.tier, reason });
    if (!t) { skip("unknown_template"); continue; }
    if (!t.isActive) { skip("inactive_template"); continue; }
    const isTables = t.values.revealPolicy === "on_group_reveal";
    if (job.tier && !isTables) { skip("not_tables"); continue; }
    if (!job.tier && isTables) { skip("not_activity"); continue; }
    const venue = isTables ? null : await venueFor(t, input.cityId);
    if (!isTables && !venue) { skip("no_partner"); continue; }
    // Étape O : quelques badges pour varier les cartes (l'équipe les change dans la fiche) : coup de cœur sur
    // l'Exclusive, « Nouveau » sur un événement sur trois, le reste en automatique (Populaire, Bientôt complet).
    const highlight = job.tier === "exclusive" ? "featured" : r.created.length % 3 === 0 ? "new" : "auto";
    const data = { ...templateExperienceInput(t, { tier: job.tier, firstDate: nextWeekdayDate(scheduleFor(t, job.tier).weekday, base), weeks: input.weeks, cityId: input.cityId, venue }), highlight };
    try {
      const res = await saveExperience({ data, addSessions: true, images: [{ path: t.image, alt: t.name }] }, { uid: actor.uid, role: actor.role, organizer: null });
      r.created.push({ templateId: t.id, tier: job.tier, experienceId: res.experienceId, sessions: res.sessionsCreated });
    } catch {
      skip("invalid");
    }
  }
}

export async function resetShowcaseCore(raw: unknown, actor: { uid: string; role: string }, now = Date.now()): Promise<ShowcaseResult> {
  const parsed = showcaseInputSchema.safeParse(raw);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const input = parsed.data;
  const city = await db.doc(`cities/${input.cityId}`).get();
  if (!city.exists || city.data()?.isActive !== true) invalidArgument([{ path: ["cityId"], message: "required" }]);
  const r: ShowcaseResult = { cancelledSessions: 0, refunded: 0, deletedSessions: 0, archived: 0, deleted: 0, created: [], skipped: [] };
  await clearEvents(actor, now, r);
  await createFromTemplates(input, actor, now, r);
  await audit({ actorUid: actor.uid, actorRole: actor.role, action: "showcase.reset", targetType: "experience", targetId: "*", after: { ...r, created: r.created.length, skipped: r.skipped } });
  return r;
}

/**
 * Site d'essai (étape Y), une seule fois : les Tables issues des modèles sont recréées à leur nouveau jour (une gamme
 * par jour). Seules celles qui n'ont jamais eu de réservation sont recréées ; les autres restent telles quelles.
 */
export async function rescheduleTablesOnce(actor: { uid: string; role: string }, now = Date.now(), cityId = "casablanca"): Promise<{ recreated: number; kept: number } | null> {
  const flag = db.doc("settings/showcase");
  if ((await flag.get()).get("tiersY")) return null;
  const tablesIds = new Set(Object.keys(TIER_SCHEDULE));
  const exps = (await db.collection("experiences").where("status", "==", "published").get()).docs.filter((d) => tablesIds.has(String(d.get("templateId"))) && d.get("venueTier"));
  const redo = new Set<string>();
  const jobs: { templateId: string; tier: VenueTier }[] = [];
  let kept = 0;
  for (const d of exps) {
    const any = await db.collection("reservations").where("experienceId", "==", d.id).limit(1).get();
    if (!any.empty) { kept++; continue; }
    redo.add(d.id);
    jobs.push({ templateId: String(d.get("templateId")), tier: d.get("venueTier") as VenueTier });
  }
  const r: ShowcaseResult = { cancelledSessions: 0, refunded: 0, deletedSessions: 0, archived: 0, deleted: 0, created: [], skipped: [] };
  if (redo.size) await clearEvents(actor, now, r, (_e, id) => redo.has(id));
  if (jobs.length) await createFromTemplates({ confirm: "SUPPRIMER", tables: jobs, activities: [], weeks: 4, cityId }, actor, now, r);
  await flag.set({ tiersY: FieldValue.serverTimestamp() }, { merge: true });
  return { recreated: r.created.length, kept };
}

/**
 * Site d'essai (étape S), une seule fois : la gamme sort des titres (« Dîner Premium » → « Dîner ») et les doublons
 * créés par la Vitrine puis par le déploiement (même modèle, même gamme) sont retirés. On garde ceux qui ont des
 * réservations ; sinon celui créé au déploiement (textes à jour). Les autres sont supprimés (ou archivés, dates annulées).
 */
export async function tidyTemplateEventsOnce(actor: { uid: string; role: string }, now = Date.now()): Promise<{ renamed: number; removed: number } | null> {
  const flag = db.doc("settings/showcase");
  if ((await flag.get()).get("tidyS")) return null;
  const saved = (await db.collection("eventTemplates").get()).docs.map((d) => ({ ...(d.data() as Omit<EventTemplate, "id">), id: d.id }) as EventTemplate);
  const templates = new Map(mergeTemplates(saved).map((t) => [t.id, t]));
  const exps = (await db.collection("experiences").where("status", "in", ["published", "draft"]).get()).docs.filter((d) => d.get("templateId"));
  let renamed = 0;
  for (const d of exps) {
    const t = templates.get(String(d.get("templateId")));
    const title = String(d.get("title.fr") ?? "");
    if (t && /\s(Casual|Premium|Exclusive)$/.test(title) && title.replace(/\s(Casual|Premium|Exclusive)$/, "") === t.values.titleFr) {
      await d.ref.update({ "title.fr": t.values.titleFr });
      renamed++;
    }
  }
  const groups = new Map<string, FirebaseFirestore.QueryDocumentSnapshot[]>();
  for (const d of exps) {
    const k = `${d.get("templateId")}|${d.get("venueTier") || "-"}|${d.get("cityId")}`;
    groups.set(k, [...(groups.get(k) ?? []), d]);
  }
  const remove = new Set<string>();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const withPeople = new Set<string>();
    for (const d of list) {
      const r = await db.collection("reservations").where("experienceId", "==", d.id).where("status", "in", ["confirmed", "pending_payment"]).limit(1).get();
      if (!r.empty) withPeople.add(d.id);
    }
    const keep = withPeople.size ? withPeople : new Set([(list.find((d) => d.get("updatedBy") === "seed-content") ?? list[list.length - 1]).id]);
    for (const d of list) if (!keep.has(d.id)) remove.add(d.id);
  }
  const r: ShowcaseResult = { cancelledSessions: 0, refunded: 0, deletedSessions: 0, archived: 0, deleted: 0, created: [], skipped: [] };
  if (remove.size) await clearEvents(actor, now, r, (_e, id) => remove.has(id));
  await flag.set({ tidyS: FieldValue.serverTimestamp() }, { merge: true });
  return { renamed, removed: remove.size };
}

/**
 * Site d'essai (étape Q) : remplace les ANCIENS événements de démonstration (isDemo) par ceux des modèles, une seule
 * fois (réglage settings/showcase). Les événements créés par l'équipe ne sont pas touchés. Toutes les Tables qui ont un
 * lieu compatible dans leur gamme et toutes les activités qui ont un lieu partenaire sont créées. Appelé par le contenu
 * de départ du site d'essai (jamais en production).
 */
export async function replaceDemoEventsOnce(actor: { uid: string; role: string }, now = Date.now(), cityId = "casablanca"): Promise<ShowcaseResult | null> {
  const flag = db.doc("settings/showcase");
  if ((await flag.get()).get("demoReplacedAt")) return null;
  const partners = (await db.collection("partners").where("status", "==", "active").get()).docs.map((d) => d.data() as { cityId?: string; formats?: string[]; tiers?: string[] });
  const saved = (await db.collection("eventTemplates").get()).docs.map((d) => ({ ...(d.data() as Omit<EventTemplate, "id">), id: d.id }) as EventTemplate);
  const templates = mergeTemplates(saved).filter((t) => t.isActive);
  const tables: { templateId: string; tier: VenueTier }[] = [];
  const activities: string[] = [];
  for (const t of templates) {
    const hosts = partners.filter((p) => p.cityId === cityId && (p.formats ?? []).includes(t.id));
    if (t.values.revealPolicy === "on_group_reveal") {
      for (const tier of VENUE_TIERS) if (hosts.some((p) => (p.tiers ?? []).includes(tier))) tables.push({ templateId: t.id, tier });
    } else if (hosts.length) activities.push(t.id);
  }
  const r: ShowcaseResult = { cancelledSessions: 0, refunded: 0, deletedSessions: 0, archived: 0, deleted: 0, created: [], skipped: [] };
  await clearEvents(actor, now, r, (e) => e.isDemo === true);
  await createFromTemplates({ confirm: "SUPPRIMER", tables, activities, weeks: 4, cityId }, actor, now, r);
  // Créées directement à leur jour par gamme (étape Y) : pas besoin de les recréer ensuite.
  await flag.set({ demoReplacedAt: FieldValue.serverTimestamp(), created: r.created.length, tiersY: FieldValue.serverTimestamp() }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: actor.role, action: "showcase.replaceDemo", targetType: "experience", targetId: "*", after: { ...r, created: r.created.length, skipped: r.skipped } });
  return r;
}

/**
 * Vitrine (docs/22, étape M, décision 35) : remplace TOUS les événements par ceux des modèles validés.
 * Super-admin uniquement, confirmation « SUPPRIMER » obligatoire. Les dates à venir avec des participants sont annulées
 * et remboursées intégralement ; les événements sans historique sont supprimés, les autres archivés (factures, avis gardés).
 * Puis : une Table par modèle et gamme choisis (lieu attribué automatiquement), une activité par modèle choisi
 * à condition qu'un lieu partenaire actif accueille ce format (sinon, signalée et non créée).
 */
export const adminResetShowcase = onCall({ region: REGION, timeoutSeconds: 540, memory: "512MiB" }, async (req) => {
  const a = requireRole(req, ["superadmin"]);
  if ((req.data as { confirm?: unknown } | null)?.confirm !== "SUPPRIMER") throw new HttpsError("failed-precondition", "Tapez SUPPRIMER pour confirmer.", { reason: "confirm_required" });
  return resetShowcaseCore(req.data, { uid: a.uid, role: "superadmin" });
});
