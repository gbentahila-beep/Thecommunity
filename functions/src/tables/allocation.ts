import {
  ACTIVE_REQUEST_STATUSES, allocateTables, allocationSettingsOf, DEFAULT_EVENT_TEMPLATES, groupCount, partnerMatches, partnerUnitsAt, peopleFor, reliabilityOf,
  venueFinalText, venueRecapText, venueReminderText, venueRequestText, type HostPartner, type SessionVenue, type VenueRequestInfo, type VenueUnit,
} from "@thecommunity/shared";
import { randomBytes } from "node:crypto";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";
import { dateTimeFr, SITE_URL } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { venueMessageMail } from "../mail/templates";
import { sendWhatsApp, type WhatsAppKind } from "../whatsapp/whatsapp";
import { teamAlert } from "./team";
import { seenCount, visitedVenueKeys } from "./venue-memory";

/**
 * Attribution automatique des lieux (docs/22, décisions 41 à 45). Les demandes sont dans `venueRequests/{id}`
 * (équipe seulement) : lieu, date, tables, personnes, statut (sent → confirmed / refused / expired / cancelled),
 * jeton du lien sécurisé envoyé au lieu, canaux utilisés, historique. Aucune place n'est attribuée avant confirmation.
 */

const HOUR = 3_600_000;
/** Deux dates « se chevauchent » chez un lieu si elles commencent à moins de 3 h d'écart le même soir. */
const SLOT_WINDOW = 3 * HOUR;

export const isAllocated = (e: DocumentData | undefined) => e?.venue?.revealPolicy === "on_group_reveal";

const TIER_LABELS: Record<string, string> = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" };
export const formatName = (e: DocumentData) => DEFAULT_EVENT_TEMPLATES.find((t) => t.id === (e.templateId || e.subcategoryId))?.name ?? String(e.title?.fr ?? "Rendez-vous");

type PartnerDoc = HostPartner & { address?: string; geo?: { lat: number; lng: number } | null; cuisineI18n?: { ar?: string; en?: string } | null; contactEmail?: string; whatsapp?: string; contactPhone?: string; stats?: { requests?: number; accepted?: number } };

export async function activePartners(): Promise<PartnerDoc[]> {
  const snap = await db.collection("partners").where("status", "==", "active").get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PartnerDoc, "id">) }));
}

/** Tables déjà demandées à chaque lieu par d'autres dates du même créneau (capacité partagée, décision 41). */
async function usedByOthers(startAt: Date, sessionId: string): Promise<Map<string, number>> {
  const snap = await db.collection("venueRequests")
    .where("startAt", ">", Timestamp.fromMillis(startAt.getTime() - SLOT_WINDOW))
    .where("startAt", "<", Timestamp.fromMillis(startAt.getTime() + SLOT_WINDOW))
    .get();
  const out = new Map<string, number>();
  for (const d of snap.docs) {
    const r = d.data();
    if (r.sessionId === sessionId || !(ACTIVE_REQUEST_STATUSES as readonly string[]).includes(r.status)) continue;
    out.set(r.partnerId, (out.get(r.partnerId) ?? 0) + Number(r.tables ?? 0));
  }
  return out;
}

/** Lieux compatibles avec une date et ressources encore disponibles chez chacun. */
export async function candidatesFor(sessionId: string, s: DocumentData, e: DocumentData, partners?: PartnerDoc[]) {
  const startAt = (s.startAt as Timestamp).toDate();
  const [list, used] = await Promise.all([partners ? Promise.resolve(partners) : activePartners(), usedByOthers(startAt, sessionId)]);
  return list
    .filter((p) => partnerMatches(p, { templateId: e.templateId, subcategoryId: e.subcategoryId, venueTier: e.venueTier, cityId: e.cityId }))
    .map((p) => ({ partner: p, available: Math.max(0, partnerUnitsAt(p, startAt) - (used.get(p.id) ?? 0)) }))
    .filter((c) => c.available > 0);
}

/** Personnes pour lesquelles on prend une option la veille à 15h : les inscrits + une table de marge, au plus les places de la date. */
export function optionPeople(confirmed: number, e: DocumentData, capacity: number): number {
  if (confirmed <= 0) return 0;
  const margin = e.groupConfig ? Number(e.groupConfig.maxSize ?? 6) : 0;
  return capacity > 0 ? Math.min(capacity, confirmed + margin) : confirmed + margin;
}

/** Taille des tables et nombre de ressources nécessaires pour `people` personnes. */
function needOf(people: number, e: DocumentData): number {
  if (people <= 0) return 0;
  return e.groupConfig ? groupCount(people, e.groupConfig) : people;
}
const tableMax = (e: DocumentData) => Number(e.groupConfig?.maxSize ?? 1);

/**
 * Plafond de vente (décision 43) : personnes que les lieux compatibles peuvent encore accueillir sur ce créneau,
 * moins les places déjà vendues par les autres dates du même créneau qui puisent dans les mêmes lieux.
 * null = pas de plafond (lieu fixe, ou lieux déjà choisis pour cette date).
 */
export async function venueCapacity(sessionId: string, s: DocumentData, e: DocumentData): Promise<number | null> {
  if (!isAllocated(e)) return null;
  // Lieux déjà choisis par l'équipe (pour la date, ou lieu habituel du rendez-vous) : pas de plafond automatique.
  const { sessionVenues } = await import("../experiences/venues");
  if ((await sessionVenues(sessionId, s.experienceId, e)).venues.length > 0) return null;
  const startAt = (s.startAt as Timestamp).toDate();
  const partners = await activePartners();
  const cands = await candidatesFor(sessionId, s, e, partners);
  const max = tableMax(e);
  let cap = cands.reduce((n, c) => n + (e.groupConfig ? peopleFor(c.partner, c.available, max) : c.available), 0);
  if (cap === 0) return 0;
  const pool = new Set(cands.map((c) => c.partner.id));
  const others = await db.collection("sessions")
    .where("startAt", ">", Timestamp.fromMillis(startAt.getTime() - SLOT_WINDOW))
    .where("startAt", "<", Timestamp.fromMillis(startAt.getTime() + SLOT_WINDOW))
    .get();
  const exps = new Map<string, DocumentData>();
  for (const o of others.docs) {
    const x = o.data();
    if (o.id === sessionId || !["published", "full"].includes(x.status) || x.allocation?.status) continue;
    const oe = exps.get(x.experienceId) ?? (await db.doc(`experiences/${x.experienceId}`).get()).data() ?? {};
    exps.set(x.experienceId, oe);
    if (!isAllocated(oe)) continue;
    const shares = partners.some((p) => pool.has(p.id) && partnerMatches(p, { templateId: oe.templateId, subcategoryId: oe.subcategoryId, venueTier: oe.venueTier, cityId: oe.cityId }));
    if (shares) cap -= Number(x.seatsConfirmed ?? 0) + Number(x.seatsHeld ?? 0);
  }
  return Math.max(0, cap);
}

/** Répartit `people` personnes en `n` tables (tailles égales à une près, les plus grandes d'abord). */
function sizes(people: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(people / n);
  return Array.from({ length: n }, (_, i) => base + (i < people % n ? 1 : 0));
}

export function requestLink(id: string, token: string) {
  return `${SITE_URL}/partenaire/demande/${id}?t=${token}`;
}

function infoOf(r: DocumentData, id: string): VenueRequestInfo {
  return {
    venue: String(r.partnerName ?? ""), title: String(r.title ?? ""), when: dateTimeFr((r.startAt as Timestamp).toDate()), format: String(r.format ?? ""),
    tier: r.tier ? TIER_LABELS[r.tier] ?? r.tier : null, tables: Number(r.tables ?? 0), people: Number(r.people ?? 0), unit: (r.unit ?? "table") as VenueUnit,
    reference: String(r.reference ?? ""), link: requestLink(id, String(r.token ?? "")),
  };
}

/** Envoie la demande (ou la relance) par e-mail et par WhatsApp automatique ; garde le statut de chaque canal. */
export async function sendRequestMessages(id: string, kind: "request" | "reminder") {
  const ref = db.doc(`venueRequests/${id}`);
  const r = (await ref.get()).data();
  if (!r) return;
  const info = infoOf(r, id);
  const text = kind === "request" ? venueRequestText(info) : venueReminderText(info);
  const subject = kind === "request" ? `Wenzy · Demande de réservation · ${info.when}` : `Wenzy · Rappel · ${info.when}`;
  const [email, whatsapp] = await Promise.all([
    r.partnerEmail ? sendMail({ to: r.partnerEmail, locale: "fr", ...venueMessageMail({ subject, text, link: info.link, cta: "Accepter ou refuser" }), kind: `venue_${kind}`, refs: { requestId: id, sessionId: r.sessionId } }).then((m) => m.status) : Promise.resolve("no_email"),
    sendWhatsApp({ to: r.partnerWhatsapp ?? "", kind: kind as WhatsAppKind, text, params: [info.venue, info.when, `${info.tables} × ${info.people} pers. (${info.format}${info.tier ? ` ${info.tier}` : ""})`, info.link], refs: { requestId: id } }),
  ]);
  await ref.update({ [`channels.${kind}`]: { email, whatsapp, at: Timestamp.now() }, ...(kind === "reminder" ? { remindedAt: FieldValue.serverTimestamp() } : {}), history: FieldValue.arrayUnion({ at: Timestamp.now(), event: kind, email, whatsapp }) });
}

/**
 * Calcule les tables nécessaires, retient les lieux compatibles (capacité partagée, lieux réguliers et fiables
 * d'abord, répartition équilibrée) et envoie une demande à chacun. Les lieux qui ont déjà refusé ou pas répondu pour
 * cette date sont écartés. Tables manquantes : alerte à l'équipe. Renvoie ce qui a été demandé.
 */
export async function runAllocation(sessionId: string, actorUid: string, opts: { option?: boolean } = {}): Promise<{ needed: number; requested: number; missing: number }> {
  const sessRef = db.doc(`sessions/${sessionId}`);
  const s = (await sessRef.get()).data();
  if (!s) return { needed: 0, requested: 0, missing: 0 };
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  // Timeline du 24/11 : les demandes d'option partent la veille à 15h, réservations encore ouvertes → une table de
  // marge (dans la limite des places de la date). Après la fermeture : le nombre réel. Un nouveau tour garde la base.
  const confirmed = Number(s.seatsConfirmed ?? 0);
  const optionPhase = opts.option || (s.allocation?.phase === "option" && !s.allocation?.finalAt);
  const people = optionPhase ? optionPeople(confirmed, e, Number(s.capacity ?? 0)) : confirmed;
  const needed = needOf(people, e);
  const existing = await db.collection("venueRequests").where("sessionId", "==", sessionId).get();
  const active = existing.docs.filter((d) => (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(d.data().status));
  const already = active.reduce((n, d) => n + Number(d.data().tables ?? 0), 0);
  const tried = new Set(existing.docs.map((d) => String(d.data().partnerId)));
  const missingBefore = Math.max(0, needed - already);
  const round = Number(s.allocation?.round ?? 0) + 1;
  let requested = 0;
  let missing = missingBefore;
  if (missingBefore > 0) {
    const cands = (await candidatesFor(sessionId, s, e)).filter((c) => !tried.has(c.partner.id));
    // Lot C : rotation des restaurants — part des inscrits déjà venus dans chaque lieu (les moins connus d'abord).
    const uids = (await db.collection("reservations").where("sessionId", "==", sessionId).where("status", "==", "confirmed").get()).docs.map((d) => String(d.get("userId")));
    const visited = uids.length ? await visitedVenueKeys(uids, sessionId) : new Map<string, Set<string>>();
    const alloc = allocateTables(missingBefore, cands.map((c) => ({ partnerId: c.partner.id, name: c.partner.name, units: c.available, regular: c.partner.level === "regular", reliability: reliabilityOf(c.partner.stats), seen: uids.length ? seenCount(visited, uids, { partnerId: c.partner.id, name: c.partner.name }) / uids.length : 0 })));
    missing = alloc.missing;
    const all = sizes(people, needed);
    let cursor = already;
    const byId = new Map(cands.map((c) => [c.partner.id, c.partner]));
    for (const line of alloc.lines) {
      const p = byId.get(line.partnerId)!;
      const share = all.slice(cursor, cursor + line.tables).reduce((a, b) => a + b, 0) || line.tables * Number(p.unitMin ?? 1);
      cursor += line.tables;
      const ref = db.collection("venueRequests").doc();
      await ref.set({
        sessionId, experienceId: s.experienceId, partnerId: p.id, partnerName: p.name, partnerEmail: p.contactEmail ?? "", partnerWhatsapp: p.whatsapp || p.contactPhone || "",
        address: p.address ?? "", geo: p.geo ?? null, cuisine: p.cuisine ?? "", cuisineI18n: p.cuisineI18n ?? null, title: String(e.title?.fr ?? ""), format: formatName(e), tier: e.venueTier ?? null, unit: p.unit ?? "table",
        startAt: s.startAt, tables: line.tables, people: share, reference: `W-${ref.id.slice(0, 6).toUpperCase()}`, token: randomBytes(24).toString("base64url"),
        status: "sent", round, createdAt: FieldValue.serverTimestamp(), sentAt: FieldValue.serverTimestamp(), createdBy: actorUid,
        history: [{ at: Timestamp.now(), event: "created", by: actorUid }],
      });
      await db.doc(`partners/${p.id}`).set({ stats: { requests: FieldValue.increment(1) } }, { merge: true });
      await sendRequestMessages(ref.id, "request");
      requested += line.tables;
    }
  }
  await sessRef.update({
    "allocation.status": missing > 0 ? "short" : "requested", "allocation.needed": needed, "allocation.people": people, "allocation.round": round, "allocation.missing": missing,
    "allocation.phase": optionPhase ? "option" : "final", "allocation.updatedAt": FieldValue.serverTimestamp(),
  });
  if (missing > 0) {
    await teamAlert({ sessionId, key: `alloc_short_${round}`, subject: `Lieux insuffisants : ${missing} table${missing > 1 ? "s" : ""} sans lieu`, paragraphs: [`« ${String(e.title?.fr ?? "")} », ${dateTimeFr((s.startAt as Timestamp).toDate())} : ${people} inscrits, ${needed} tables nécessaires, ${missing} sans lieu compatible disponible.`, "Ajoutez un lieu ou de la capacité, puis relancez l'attribution depuis la page de la date."], path: `/admin/sessions/${sessionId}` });
  }
  await checkAllocation(sessionId);
  return { needed, requested, missing };
}

/**
 * Fermeture des réservations (veille 20h30, timeline du 24/11) : les options prises à 15h passent au nombre réel.
 * Tables en trop → libérées (demandes en attente d'abord, puis les dernières confirmées) ; tables manquantes → nouvelle
 * demande tout de suite. Chaque lieu dont la demande change reçoit le nombre final. Une seule fois par date.
 */
export async function finalizeAllocation(sessionId: string): Promise<{ released: number; updated: number; missing: number }> {
  const sessRef = db.doc(`sessions/${sessionId}`);
  const s = (await sessRef.get()).data();
  const out = { released: 0, updated: 0, missing: 0 };
  if (!s?.allocation || s.allocation.finalAt || s.allocation.status === "manual") return out;
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  const people = Number(s.seatsConfirmed ?? 0);
  const needed = needOf(people, e);
  const reqs = (await db.collection("venueRequests").where("sessionId", "==", sessionId).get()).docs
    .filter((d) => (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(d.get("status")) && !d.get("fixed"));
  const total = reqs.reduce((n, d) => n + Number(d.get("tables") ?? 0), 0);
  // Ordre de libération : demandes en attente d'abord, puis les confirmées les plus récentes.
  const sentAt = (d: FirebaseFirestore.QueryDocumentSnapshot) => (d.get("sentAt") as Timestamp | undefined)?.toMillis() ?? 0;
  const order = [...reqs].sort((a, b) => (a.get("status") === b.get("status") ? sentAt(b) - sentAt(a) : a.get("status") === "sent" ? -1 : 1));
  const tablesOf = new Map(reqs.map((d) => [d.id, Number(d.get("tables") ?? 0)]));
  let surplus = Math.max(0, total - needed);
  for (const d of order) {
    if (surplus <= 0) break;
    const take = Math.min(tablesOf.get(d.id)!, surplus);
    tablesOf.set(d.id, tablesOf.get(d.id)! - take);
    surplus -= take;
  }
  // Répartition des personnes entre les tables gardées, dans l'ordre des demandes.
  const all = sizes(people, needed);
  let cursor = 0;
  const kept = [...reqs].sort((a, b) => sentAt(a) - sentAt(b));
  for (const d of kept) {
    const before = { tables: Number(d.get("tables") ?? 0), people: Number(d.get("people") ?? 0) };
    const tables = tablesOf.get(d.id)!;
    const share = tables > 0 ? all.slice(cursor, cursor + tables).reduce((a, b) => a + b, 0) : 0;
    cursor += tables;
    if (tables === before.tables && share === before.people) continue;
    if (tables === 0) {
      await d.ref.update({ status: "cancelled", tables: 0, released: true, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: "released", before }) });
      out.released += before.tables;
    } else {
      await d.ref.update({ tables, people: share, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: "final", before, tables, people: share }) });
      out.updated++;
    }
    await sendFinalMessage(d.id, before);
  }
  await sessRef.update({ "allocation.needed": needed, "allocation.people": people, "allocation.phase": "final", "allocation.finalAt": FieldValue.serverTimestamp() });
  const active = total - out.released;
  if (needed > active) {
    const r = await runAllocation(sessionId, "system");
    out.missing = r.missing;
  } else await checkAllocation(sessionId);
  return out;
}

/** Nombre final (ou table libérée) au lieu, par e-mail et WhatsApp. */
export async function sendFinalMessage(id: string, before: { tables: number; people: number }) {
  const ref = db.doc(`venueRequests/${id}`);
  const r = (await ref.get()).data();
  if (!r) return;
  const info = infoOf(r, id);
  const text = venueFinalText({ ...info, before });
  const subject = info.tables === 0 ? `Wenzy · Table libérée · ${info.when}` : `Wenzy · Nombre final · ${info.when}`;
  const [email, whatsapp] = await Promise.all([
    r.partnerEmail ? sendMail({ to: r.partnerEmail, locale: "fr", ...venueMessageMail({ subject, text, link: info.link, cta: "Voir la demande" }), kind: "venue_final", refs: { requestId: id, sessionId: r.sessionId } }).then((m) => m.status) : Promise.resolve("no_email"),
    sendWhatsApp({ to: r.partnerWhatsapp ?? "", kind: "final", text, params: [info.venue, info.when, info.tables === 0 ? "table libérée" : `${info.tables} × ${info.people} pers.`, info.link], refs: { requestId: id } }),
  ]);
  await ref.update({ "channels.final": { email, whatsapp, at: Timestamp.now() } });
}

/**
 * Toutes les tables confirmées ? Les lieux de la date deviennent les lieux confirmés (avec leur cuisine), utilisés
 * par la révélation. Si la date était déjà révélée (lieu remplacé tard), seules les personnes concernées sont prévenues.
 */
export async function checkAllocation(sessionId: string): Promise<boolean> {
  const sessRef = db.doc(`sessions/${sessionId}`);
  const s = (await sessRef.get()).data();
  if (!s?.allocation || s.allocation.status === "manual") return false;
  const reqs = await db.collection("venueRequests").where("sessionId", "==", sessionId).where("status", "==", "confirmed").get();
  const confirmed = reqs.docs.reduce((n, d) => n + Number(d.data().tables ?? 0), 0);
  const needed = Number(s.allocation.needed ?? 0);
  if (needed === 0 || confirmed < needed) {
    if (s.allocation.status === "confirmed") await sessRef.update({ "allocation.status": "requested", "allocation.confirmed": confirmed });
    else await sessRef.update({ "allocation.confirmed": confirmed });
    return false;
  }
  const venues: SessionVenue[] = reqs.docs.map((d) => {
    const r = d.data();
    return { partnerId: r.partnerId, name: String(r.partnerName ?? ""), address: String(r.address ?? ""), geo: r.geo ?? null, tables: Number(r.tables ?? 0), cuisine: String(r.cuisine ?? "") || null, cuisineI18n: r.cuisineI18n ?? null, rating: null };
  });
  await db.doc(`sessions/${sessionId}/private/venues`).set({ venues, updatedAt: FieldValue.serverTimestamp(), updatedBy: "allocation" });
  await sessRef.update({ "allocation.status": "confirmed", "allocation.confirmed": confirmed, "allocation.confirmedAt": FieldValue.serverTimestamp() });
  if (s.groupsStatus === "revealed") {
    const { refreshRevealed } = await import("../experiences/venues");
    const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
    await refreshRevealed(sessionId, s.experienceId, e);
  }
  return true;
}

/** Un lieu a répondu (lien) ou l'équipe a tranché (appel) : statut, historique et fiabilité du lieu ; refus → autre lieu. */
export async function settleRequest(id: string, accept: boolean, by: { kind: "partner" | "team"; uid?: string; note?: string }): Promise<"confirmed" | "refused" | "unchanged"> {
  const ref = db.doc(`venueRequests/${id}`);
  const outcome = await db.runTransaction(async (tx) => {
    const r = (await tx.get(ref)).data();
    if (!r || r.status !== "sent") return { status: "unchanged" as const, r };
    const status = accept ? ("confirmed" as const) : ("refused" as const);
    tx.update(ref, { status, respondedAt: FieldValue.serverTimestamp(), response: { by: by.kind, uid: by.uid ?? null, note: by.note ?? "" }, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: status, by: by.kind, note: by.note ?? "" }) });
    const minutes = Math.max(0, Math.round((Date.now() - (r.sentAt as Timestamp).toMillis()) / 60_000));
    tx.set(db.doc(`partners/${r.partnerId}`), { stats: { [accept ? "accepted" : "refused"]: FieldValue.increment(1), responseMinutesTotal: FieldValue.increment(minutes), responses: FieldValue.increment(1) } }, { merge: true });
    return { status, r };
  });
  if (outcome.status === "unchanged" || !outcome.r) return "unchanged";
  if (outcome.status === "confirmed") await checkAllocation(outcome.r.sessionId);
  else if (!outcome.r.fixed) await runAllocation(outcome.r.sessionId, by.uid ?? "system");
  else await teamAlert({ sessionId: outcome.r.sessionId, key: `fixed_refused_${id}`, subject: `${outcome.r.partnerName} a refusé`, paragraphs: [`Le lieu fixe de « ${outcome.r.title} » (${dateTimeFr((outcome.r.startAt as Timestamp).toDate())}) a refusé la demande.`, "Trouvez une solution avec le lieu, ou déplacez ou annulez la date."] });
  return outcome.status;
}

/** Relances et demandes sans réponse (décision 45) : relance après X min, puis autre lieu proposé. */
export async function processPendingRequests(now = Date.now(), sessionId?: string): Promise<{ reminded: number; expired: number }> {
  const conf = allocationSettingsOf((await db.doc("settings/allocation").get()).data());
  const base = db.collection("venueRequests").where("status", "==", "sent");
  const snap = await (sessionId ? base.where("sessionId", "==", sessionId) : base).get();
  const out = { reminded: 0, expired: 0 };
  for (const d of snap.docs) {
    const r = d.data();
    const sent = (r.sentAt as Timestamp | undefined)?.toMillis() ?? now;
    if ((r.startAt as Timestamp).toMillis() < now) continue;
    if (now - sent >= conf.expireAfterMinutes * 60_000) {
      await d.ref.update({ status: "expired", history: FieldValue.arrayUnion({ at: Timestamp.now(), event: "expired" }) });
      await db.doc(`partners/${r.partnerId}`).set({ stats: { expired: FieldValue.increment(1) } }, { merge: true });
      out.expired++;
      if (!r.fixed) await runAllocation(r.sessionId, "system");
      else await teamAlert({ sessionId: r.sessionId, key: `fixed_expired_${d.id}`, subject: `${r.partnerName} n'a pas répondu`, paragraphs: [`Demande pour « ${r.title} » (${dateTimeFr((r.startAt as Timestamp).toDate())}) sans réponse : appelez le lieu.`] });
    } else if (!r.remindedAt && now - sent >= conf.remindAfterMinutes * 60_000) {
      await sendRequestMessages(d.id, "reminder");
      out.reminded++;
    }
  }
  return out;
}

/** Demande au lieu fixe d'une activité (décision 47) : confirmation la veille à 15h avec le nombre d'inscrits. */
export async function requestFixedVenue(sessionId: string, s: DocumentData, e: DocumentData, partnerId: string) {
  const p = (await db.doc(`partners/${partnerId}`).get()).data() as PartnerDoc | undefined;
  if (!p) return;
  const people = Number(s.seatsConfirmed ?? 0);
  const ref = db.collection("venueRequests").doc();
  await ref.set({
    sessionId, experienceId: s.experienceId, partnerId, partnerName: p.name, partnerEmail: p.contactEmail ?? "", partnerWhatsapp: p.whatsapp || p.contactPhone || "",
    address: p.address ?? "", geo: p.geo ?? null, cuisine: p.cuisine ?? "", cuisineI18n: p.cuisineI18n ?? null, title: String(e.title?.fr ?? ""), format: formatName(e), tier: e.venueTier ?? null, unit: p.unit ?? "table",
    startAt: s.startAt, tables: Math.max(1, needOf(people, e) || 1), people, reference: `W-${ref.id.slice(0, 6).toUpperCase()}`, token: randomBytes(24).toString("base64url"),
    status: "sent", fixed: true, round: 1, createdAt: FieldValue.serverTimestamp(), sentAt: FieldValue.serverTimestamp(), createdBy: "system",
    history: [{ at: Timestamp.now(), event: "created", by: "system" }],
  });
  await db.doc(`partners/${partnerId}`).set({ stats: { requests: FieldValue.increment(1) } }, { merge: true });
  await sendRequestMessages(ref.id, "request");
}

/** Annule les demandes en cours d'une date (date annulée ou vidée). */
export async function cancelRequests(sessionId: string) {
  const snap = await db.collection("venueRequests").where("sessionId", "==", sessionId).get();
  for (const d of snap.docs.filter((x) => (ACTIVE_REQUEST_STATUSES as readonly string[]).includes(x.data().status))) {
    const before = { tables: Number(d.get("tables") ?? 0), people: Number(d.get("people") ?? 0) };
    await d.ref.update({ status: "cancelled", tables: 0, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: "cancelled", before }) });
    // Timeline du 24/11 : le lieu a pu recevoir une option la veille à 15h → il est prévenu que la table est libérée.
    await sendFinalMessage(d.id, before).catch(() => undefined);
  }
}

/** Récapitulatif au lieu (jour J 11h, ou la veille au soir pour un début avant 14h) : tables, prénoms, régimes et allergies partagés. */
export async function sendRecap(requestId: string, tables: { label: string; names: string[] }[], notes: string[], opts: { onlyIfChanged?: boolean } = {}): Promise<boolean> {
  const ref = db.doc(`venueRequests/${requestId}`);
  const r = (await ref.get()).data();
  if (!r) return false;
  const info = infoOf(r, requestId);
  const people = tables.reduce((n, t) => n + t.names.reduce((m, x) => m + 1 + (/\(\+(\d+)\)/.exec(x) ? Number(/\(\+(\d+)\)/.exec(x)![1]) : 0), 0), 0);
  // 1 h avant : mise à jour seulement si les tables, les prénoms ou les allergies ont changé depuis le récapitulatif.
  const update = Boolean(opts.onlyIfChanged);
  if (update && JSON.stringify({ tables: r.recap?.tables ?? [], notes: r.recap?.notes ?? [] }) === JSON.stringify({ tables, notes })) return false;
  const text = venueRecapText({ venue: info.venue, when: info.when, title: info.title, tables, people, notes, unit: info.unit, link: info.link, update });
  const [email, whatsapp] = await Promise.all([
    r.partnerEmail ? sendMail({ to: r.partnerEmail, locale: "fr", ...venueMessageMail({ subject: `Wenzy · ${update ? "Mise à jour du récapitulatif" : "Récapitulatif"} · ${info.when}`, text, link: info.link, cta: "Voir le détail" }), kind: "venue_recap", refs: { requestId, sessionId: r.sessionId } }).then((m) => m.status) : Promise.resolve("no_email"),
    sendWhatsApp({ to: r.partnerWhatsapp ?? "", kind: "recap", text, params: [info.venue, info.when, `${tables.length} × ${people} pers.`, info.link], refs: { requestId } }),
  ]);
  await ref.update({ recap: { tables, notes, people, text }, recapSentAt: FieldValue.serverTimestamp(), "channels.recap": { email, whatsapp, at: Timestamp.now() }, history: FieldValue.arrayUnion({ at: Timestamp.now(), event: update ? "recap_update" : "recap", email, whatsapp }) });
  return true;
}
