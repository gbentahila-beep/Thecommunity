import { missingTierDates, MOROCCO_TIMEZONE, onRendezvousSlot, rendezvousInputSchema, tierRange, tierRunsOn, zonedParts, type RendezvousFrequency, type VenueTier } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { sessionDocFor } from "../experiences/add-sessions";

/**
 * docs/25 — rendez-vous de la semaine. Un rendez-vous (rendezvous/{id}) fixe le jour, l'heure, les places et ses
 * gammes ; chaque gamme est une expérience à part entière (prix, restaurants de sa gamme, tables, liste d'attente),
 * créée en copiant une expérience de base. Les dates sont ensuite créées toutes seules (ensureRendezvousSessions).
 */

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "rendez-vous";

/** Copie de l'expérience de base pour une gamme (ou l'expérience de base elle-même si elle est déjà de cette gamme). */
export async function tierExperience(rvId: string, base: FirebaseFirestore.DocumentSnapshot, tier: VenueTier, used: Set<string>, slot?: { weekday: number; time: string }): Promise<string> {
  const existing = await db.collection("experiences").where("rendezvousId", "==", rvId).where("venueTier", "==", tier).limit(1).get();
  const range = tierRange(tier, base.get("subcategoryId") as string | undefined);
  // 24/11 : une Table de rendez-vous = chacun règle sa consommation au restaurant (budget de la gamme affiché) ;
  // seuls les 35 DH Wenzy se paient en ligne.
  const tablesPricing = base.get("categoryId") === "eat"
    ? { pricing: { model: "variable_consumption", currency: "MAD", partner: { name: "", paymentMode: "on_site", pricingType: "consumption", price: null, description: "" } } }
    : {};
  const tierFields = {
    ...tablesPricing,
    rendezvousId: rvId,
    closeRule: "eve",
    ...(slot ? { rendezvousSlot: slot } : {}),
    venueTier: tier,
    budgetRange: { min: range.min * 100, max: range.max * 100, currency: "MAD" },
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (!existing.empty) {
    await existing.docs[0]!.ref.update({ rendezvousId: rvId, closeRule: "eve", ...(slot ? { rendezvousSlot: slot } : {}), updatedAt: FieldValue.serverTimestamp() });
    used.add(existing.docs[0]!.id);
    return existing.docs[0]!.id;
  }
  const b = base.data()!;
  if (!used.has(base.id) && (!b.rendezvousId || b.rendezvousId === rvId) && (b.venueTier === tier || !b.venueTier)) {
    await base.ref.update(tierFields);
    used.add(base.id);
    return base.id;
  }
  const ref = db.collection("experiences").doc();
  const { nextSessionAt: _n, ratingAvg: _a, ratingCount: _c, ratingSum: _s, createdAt: _cr, ...rest } = b;
  void _n; void _a; void _c; void _s; void _cr;
  await ref.set({ ...rest, ...tierFields, slug: `${String(b.slug ?? rvId).replace(/-(casual|premium|exclusive)$/, "")}-${tier}`, ratingAvg: 0, ratingCount: 0, ratingSum: 0, nextSessionAt: null, createdAt: FieldValue.serverTimestamp() });
  // Lieux habituels et données privées (lieu secret) suivent la copie.
  const priv = await base.ref.collection("private").get();
  await Promise.all(priv.docs.map((d) => ref.collection("private").doc(d.id).set(d.data())));
  used.add(ref.id);
  return ref.id;
}

/** Équipe : créer ou modifier un rendez-vous de la semaine. Journalisé. */
export const adminSaveRendezvous = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = rendezvousInputSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const x = v.data;
  const base = await db.doc(`experiences/${x.baseExperienceId}`).get();
  if (!base.exists) throw new HttpsError("not-found", "Expérience de base introuvable.", { reason: "not_found" });
  const id = x.id ?? `${slugify(x.titleFr)}-${Math.random().toString(36).slice(2, 6)}`;
  const ref = db.doc(`rendezvous/${id}`);
  const before = (await ref.get()).data() ?? null;
  const used = new Set<string>();
  const tiers: { tier: VenueTier; experienceId: string; frequency: RendezvousFrequency }[] = [];
  for (const t of x.tiers) tiers.push({ tier: t.tier, frequency: t.frequency, experienceId: await tierExperience(id, base, t.tier, used, { weekday: x.weekday, time: x.time }) });
  await ref.set({
    title: { fr: x.titleFr, ...(x.titleAr ? { ar: x.titleAr } : {}), ...(x.titleEn ? { en: x.titleEn } : {}) },
    cityId: x.cityId,
    weekday: x.weekday,
    time: x.time,
    capacity: x.capacity,
    weeksAhead: x.weeksAhead,
    tiers,
    status: x.status,
    baseExperienceId: x.baseExperienceId,
    ...(before ? {} : { createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actor.uid,
  }, { merge: true });
  for (const t of tiers) await retireOffScheduleDates(t.experienceId, x.weekday, x.time, new Date());
  const created = x.status === "active" ? await ensureSessionsFor(id) : 0;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: before ? "rendezvous.update" : "rendezvous.create", targetType: "rendezvous", targetId: id, after: { weekday: x.weekday, time: x.time, tiers: tiers.map((t) => `${t.tier}:${t.frequency}`).join(" "), created } });
  return { ok: true, id, tiers, created };
});

/**
 * Expérience reprise dans un rendez-vous : ses dates à venir qui ne tombent pas sur le jour et l'heure du rendez-vous
 * et qui n'ont AUCUN inscrit (ni place bloquée, ni liste d'attente) sont retirées, pour ne pas mélanger deux calendriers.
 * Les dates qui ont des inscrits sont gardées telles quelles.
 */
export async function retireOffScheduleDates(experienceId: string, weekday: number, time: string, now: Date): Promise<number> {
  const future = await db.collection("sessions").where("experienceId", "==", experienceId).where("startAt", ">", Timestamp.fromDate(now)).get();
  const [h, m] = time.split(":").map(Number) as [number, number];
  let n = 0;
  for (const d of future.docs) {
    const z = zonedParts((d.get("startAt") as Timestamp).toDate(), MOROCCO_TIMEZONE);
    const onSchedule = z.weekday === weekday && z.hour === h && z.minute === m;
    const empty = Number(d.get("seatsConfirmed") ?? 0) === 0 && Number(d.get("seatsHeld") ?? 0) === 0 && Number(d.get("waitlistCount") ?? 0) === 0;
    if (onSchedule || !empty || !["published", "full", "draft"].includes(String(d.get("status")))) continue;
    await d.ref.update({ status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: "system", reason: "rendezvous_schedule" }, updatedAt: FieldValue.serverTimestamp() });
    n++;
  }
  return n;
}

/** Crée les dates manquantes d'un rendez-vous (chaque gamme selon sa fréquence), sur `weeksAhead` semaines. */
export async function ensureSessionsFor(rvId: string, now = new Date()): Promise<number> {
  const rv = (await db.doc(`rendezvous/${rvId}`).get()).data();
  if (!rv || rv.status !== "active") return 0;
  if (rv.kind === "rotation") {
    const { ensureRotationSessions } = await import("./rotation");
    return (await ensureRotationSessions(rvId, now)).created;
  }
  let created = 0;
  for (const t of (rv.tiers ?? []) as { tier: VenueTier; experienceId: string; frequency: RendezvousFrequency }[]) {
    const eSnap = await db.doc(`experiences/${t.experienceId}`).get();
    const e = eSnap.data() as DocumentData | undefined;
    if (!e || e.status === "archived") continue;
    const future = await db.collection("sessions").where("experienceId", "==", t.experienceId).where("startAt", ">", Timestamp.fromDate(now)).get();
    // Une date hors de la fréquence de sa gamme (ex. Exclusive un autre mercredi que le premier du mois) ou hors du jour
    // et de l'heure du rendez-vous disparaît si personne n'y est inscrit (gardée sinon, pour ses inscrits).
    const kept = [];
    for (const d of future.docs.filter((x) => x.get("status") !== "cancelled")) {
      const at = (d.get("startAt") as Timestamp).toDate();
      if (tierRunsOn(t.frequency, at) && onRendezvousSlot(at, e)) {
        // Date créée avant le rattachement au rendez-vous : on lui donne son identifiant (gamme voisine, listes).
        if (d.get("rendezvousId") !== rvId) await d.ref.update({ rendezvousId: rvId });
        kept.push(d);
        continue;
      }
      const people = Number(d.get("seatsConfirmed") ?? 0) + Number(d.get("seatsHeld") ?? 0) + Number(d.get("waitlistCount") ?? 0);
      const any = people > 0 ? null : await db.collection("reservations").where("sessionId", "==", d.id).limit(1).get();
      if (any?.empty) await db.recursiveDelete(d.ref);
      else kept.push(d);
    }
    const existing = kept.map((d) => (d.get("startAt") as Timestamp).toDate());
    const missing = missingTierDates({ weekday: Number(rv.weekday), time: String(rv.time), weeksAhead: Number(rv.weeksAhead ?? 6) }, t, existing, now);
    const current = (e.nextSessionAt as Timestamp | null | undefined)?.toMillis();
    const all = [...missing, ...existing].map((d) => d.getTime());
    // Prochaine date réelle (une date retirée du calendrier ne doit plus servir au tri des listes).
    const first = all.length ? Math.min(...all) : null;
    if (!missing.length) {
      if (first !== null && current !== first) await eSnap.ref.update({ nextSessionAt: Timestamp.fromMillis(first) });
      continue;
    }
    const batch = db.batch();
    const minutes = Number(e.durationMinutes ?? 120);
    for (const d of missing) batch.set(db.collection("sessions").doc(), sessionDocFor(e, t.experienceId, d, new Date(d.getTime() + minutes * 60_000), Number(rv.capacity)));
    if (first !== null && current !== first) batch.update(eSnap.ref, { nextSessionAt: Timestamp.fromMillis(first) });
    await batch.commit();
    created += missing.length;
  }
  return created;
}

/** Chaque nuit : les dates des rendez-vous actifs sont prolongées (toujours `weeksAhead` semaines devant soi). */
export async function ensureAllRendezvousSessions(now = new Date()) {
  const snap = await db.collection("rendezvous").where("status", "==", "active").get();
  let created = 0;
  for (const d of snap.docs) {
    try {
      created += await ensureSessionsFor(d.id, now);
    } catch (e) {
      logger.error("Dates d'un rendez-vous", { id: d.id, error: String(e) });
    }
  }
  if (created) logger.info(`${created} date(s) de rendez-vous créée(s).`);
  return created;
}

export const rendezvousSessions = onSchedule({ schedule: "17 3 * * *", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  await ensureAllRendezvousSessions();
  // Lot E : les événements retirés du programme sont archivés après leur dernière date honorée.
  const { archiveRetiredExperiences } = await import("./launch");
  const n = await archiveRetiredExperiences();
  if (n) logger.info(`${n} événement(s) retiré(s) du programme archivé(s).`);
});
