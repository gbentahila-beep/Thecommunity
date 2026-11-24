import { ageOn, assignGroupsToVenues, assignTablesAvoidingRepeats, byTableLabel, composeGroups, EXERCISE_FREQUENCIES, isTablesFlow, pairKey, tableSummary, tablesTimeline, VENUE_BUDGETS, type MatchPerson, type MatchQuestion, type TableSummary } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { dateTimeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { icsAttachment } from "../notify/ics";
import { groupRevealedMail, venueRevealedMail } from "../mail/templates";
import { refuse } from "../reservations/refuse";
import { refreshRevealed, sessionVenues, venueByGroup } from "../experiences/venues";
import { seenCount, visitedVenueKeys } from "../tables/venue-memory";

const TEAM = ["admin", "superadmin"] as const;
const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
const ACTIVE = ["confirmed", "attended"];

type Participant = { reservationId: string; uid: string; seats: number; user: DocumentData; languages: string[]; reservation: DocumentData };

/** Session, expérience (avec sa configuration de groupes) et participants confirmés. */
async function loadSession(sessionId: string) {
  const sess = await db.doc(`sessions/${sessionId}`).get();
  if (!sess.exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const s = sess.data()!;
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  if (!e.groupConfig) refuse("no_groups", "Cette expérience ne se fait pas en groupes composés.");
  const res = await db.collection("reservations").where("sessionId", "==", sessionId).get();
  const active = res.docs.filter((d) => ACTIVE.includes(d.data().status));
  const users = active.length ? await db.getAll(...active.map((d) => db.doc(`users/${d.data().userId}`))) : [];
  const participants: Participant[] = active.map((d, i) => {
    const r = d.data();
    const u = users[i]!.data() ?? {};
    const table = (r.preferences?.languages ?? []) as string[];
    return { reservationId: d.id, uid: r.userId, seats: r.seats ?? 1, user: u, languages: table.length ? table : ((u.languages ?? ["fr"]) as string[]), reservation: r };
  });
  return { sessRef: sess.ref, s, e, participants };
}

/** Étape 31 : paires de personnes dont l'une a demandé à ne plus être réunie avec l'autre. */
async function avoidPairs(uids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  if (!uids.length) return out;
  const docs = await db.getAll(...uids.map((u) => db.doc(`avoids/${u}`)));
  docs.forEach((d, i) => ((d.get("uids") as string[] | undefined) ?? []).forEach((o) => uids.includes(o) && out.add(pairKey(uids[i]!, o))));
  return out;
}

/** Paires de personnes déjà réunies à une même table (groupes révélés d'autres dates). */
async function pastPairs(uids: string[], sessionId: string): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await db.collection("groups").where("memberIds", "array-contains-any", uids.slice(i, i + 30)).get();
    for (const g of snap.docs) {
      const d = g.data();
      if (d.status !== "revealed" || d.sessionId === sessionId) continue;
      const ms = (d.memberIds as string[]).filter((m) => uids.includes(m));
      for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) out.add(pairKey(ms[a]!, ms[b]!));
    }
  }
  return out;
}

const memberSnapshot = (p: Participant) => ({
  uid: p.uid,
  firstName: String(p.user.firstName ?? "Membre"),
  ...(p.user.photoPath ? { photoPath: p.user.photoPath } : {}),
  interests: (p.user.interests ?? []) as string[],
  ...(p.seats > 1 ? { guests: p.seats - 1 } : {}),
});

/** Remplace tous les groupes de la date par `groups` (statut donné). Renvoie les identifiants. */
async function writeGroups(sessionId: string, experienceId: string, groups: { label: string; memberIds: string[] }[], status: "proposed" | "validated" | "revealed", byUid: Map<string, Participant>, actorUid: string, namesAtCheckIn = false) {
  const old = await db.collection("groups").where("sessionId", "==", sessionId).get();
  // Check-ins déjà faits : conservés pour les personnes qui restent placées (docs/22 § 17.H, H13).
  const arrived = new Set(old.docs.flatMap((d) => (d.get("arrivedUids") as string[] | undefined) ?? []));
  const late = Object.assign({}, ...old.docs.map((d) => (d.get("late") as Record<string, number> | undefined) ?? {})) as Record<string, number>;
  const revealedAt = old.docs.find((d) => d.get("revealedAt"))?.get("revealedAt");
  const batch = db.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  const ids = groups.map((g, i) => {
    const id = `${sessionId}_t${i + 1}`;
    batch.set(db.doc(`groups/${id}`), {
      sessionId,
      experienceId,
      label: g.label,
      status,
      memberIds: g.memberIds,
      members: g.memberIds.map((uid) => memberSnapshot(byUid.get(uid)!)),
      seats: g.memberIds.reduce((a, uid) => a + (byUid.get(uid)?.seats ?? 1), 0),
      arrivedUids: g.memberIds.filter((uid) => arrived.has(uid)),
      late: Object.fromEntries(g.memberIds.filter((uid) => late[uid]).map((uid) => [uid, late[uid]])),
      ...(namesAtCheckIn ? { namesAtCheckIn: true } : {}),
      ...(status === "revealed" && revealedAt ? { revealedAt } : {}),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorUid,
    });
    return id;
  });
  await batch.commit();
  return ids;
}

const labelPrefix = (e: DocumentData) => (e.bookingMode === "social_dinner" ? "Table" : "Équipe");

/** Proposer des groupes avec l'algorithme (remplace la proposition en cours ; jamais une fois révélés). */
export const adminProposeGroups = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ sessionId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const groups = await proposeGroupsCore(parsed.data.sessionId, actor.uid);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.propose", targetType: "session", targetId: parsed.data.sessionId, after: { groups } });
  return { groups };
});

/**
 * Propose des tables avec l'algorithme (remplace la proposition en cours ; jamais une fois révélées). `count` : nombre
 * de tables imposé (tables confirmées par les lieux, docs/22 § 17.H). Renvoie le nombre de tables.
 */
export async function proposeGroupsCore(sessionId: string, actorUid: string, count?: number): Promise<number> {
  const { sessRef, s, e, participants } = await loadSession(sessionId);
  if (s.groupsStatus === "revealed") refuse("already_revealed", "Les groupes sont déjà révélés : modifiez-les à la main.");
  if (participants.length === 0) refuse("no_participants", "Aucun participant confirmé.");
  const now = new Date();
  const people: MatchPerson[] = participants.map((p) => ({
    uid: p.uid,
    seats: p.seats,
    age: typeof p.user.birthDate === "string" ? ageOn(p.user.birthDate, now) : null,
    gender: p.user.gender,
    languages: p.languages,
    interests: (p.user.interests ?? []) as string[],
    // Étape 30 : préférence d'âge (souple) et niveau sportif déclaré (activités physiques seulement).
    agePreference: p.user.agePreference === "similar" ? "similar" : "any",
    sportLevel: e.physicalActivity === true && typeof p.user.sportLevel === "string" ? ({ beginner: 1, intermediate: 2, advanced: 3 } as Record<string, number>)[p.user.sportLevel] ?? null : null,
    // docs/16 : réponses de l'inscription (critères souples) ; budget pour les dîners, rythme pour le sport.
    conversation: typeof p.user.conversationStyle === "number" ? p.user.conversationStyle : null,
    humor: typeof p.user.humor === "string" ? p.user.humor : null,
    vibe: typeof p.user.groupVibe === "string" ? p.user.groupVibe : null,
    budget: e.bookingMode === "social_dinner" && typeof p.user.venueBudget === "string" ? (VENUE_BUDGETS as readonly string[]).indexOf(p.user.venueBudget) : null,
    exercise: e.physicalActivity === true && typeof p.user.exerciseFrequency === "string" ? 3 - (EXERCISE_FREQUENCIES as readonly string[]).indexOf(p.user.exerciseFrequency) : null,
    sector: typeof p.user.sector === "string" ? p.user.sector : null,
    values: Array.isArray(p.user.lifeValues) ? (p.user.lifeValues as string[]) : [],
    // 18a : réponses au questionnaire de l'expérience (niveau, allure, envies…).
    ...(p.reservation.questionnaire?.answers ? { answers: p.reservation.questionnaire.answers as Record<string, number> } : {}),
  }));
  const questions = ((e.questionnaire ?? []) as MatchQuestion[]).map((q) => ({ id: q.id, kind: q.kind, match: q.match }));
  const uids = people.map((p) => p.uid);
  const groups = composeGroups(people, e.groupConfig, { pastPairs: await pastPairs(uids, sessRef.id), questions, avoidPairs: await avoidPairs(uids), ...(count ? { count } : {}) });
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const prefix = labelPrefix(e);
  await writeGroups(sessRef.id, s.experienceId, groups.map((m, i) => ({ label: `${prefix} ${i + 1}`, memberIds: m })), "proposed", byUid, actorUid);
  await sessRef.update({ groupsStatus: "proposed", groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  return groups.length;
}

/** Valide la proposition en cours telle quelle (automatisation de la révélation, docs/22 § 17.H). */
export async function validateProposedGroups(sessionId: string) {
  const groups = await db.collection("groups").where("sessionId", "==", sessionId).get();
  const batch = db.batch();
  groups.docs.forEach((g) => batch.update(g.ref, { status: "validated" }));
  batch.update(db.doc(`sessions/${sessionId}`), { groupsStatus: "validated", updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return groups.docs.map((g) => Number(g.get("seats") ?? 0));
}

/**
 * Remet les tables d'accord avec les réservations actives (1 h avant, docs/22 § 17.H) : les personnes qui ont annulé
 * sont retirées, une personne placée sur la date entre-temps rejoint la plus petite table. Renvoie la taille des tables.
 */
export async function reconcileGroups(sessionId: string, actorUid: string): Promise<{ sizes: number[]; changed: boolean }> {
  const { s, e, participants } = await loadSession(sessionId);
  const snap = await db.collection("groups").where("sessionId", "==", sessionId).get();
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const groups = snap.docs.map((d) => ({ label: String(d.get("label")), memberIds: ((d.get("memberIds") as string[]) ?? []).filter((u) => byUid.has(u)) })).sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  const placed = new Set(groups.flatMap((g) => g.memberIds));
  const before = snap.docs.reduce((n, d) => n + ((d.get("memberIds") as string[]) ?? []).length, 0);
  const seatsOf = (g: { memberIds: string[] }) => g.memberIds.reduce((n, u) => n + (byUid.get(u)?.seats ?? 1), 0);
  for (const p of participants) {
    if (placed.has(p.uid) || groups.length === 0) continue;
    groups.sort((a, b) => seatsOf(a) - seatsOf(b))[0]!.memberIds.push(p.uid);
  }
  groups.sort((a, b) => a.label.localeCompare(b.label, "fr", { numeric: true }));
  const kept = groups.filter((g) => g.memberIds.length > 0);
  const after = kept.reduce((n, g) => n + g.memberIds.length, 0);
  const changed = after !== before || kept.length !== snap.size || participants.some((p) => !placed.has(p.uid));
  if (changed) {
    const ids = await writeGroups(sessionId, s.experienceId, kept, (s.groupsStatus ?? "validated") as "proposed" | "validated" | "revealed", byUid, actorUid, isTablesFlow(e));
    if (s.groupsStatus === "revealed") {
      const batch = db.batch();
      kept.forEach((g, i) => g.memberIds.forEach((uid) => batch.update(db.doc(`reservations/${byUid.get(uid)!.reservationId}`), { groupId: ids[i], updatedAt: FieldValue.serverTimestamp() })));
      await batch.commit();
      if (isTablesFlow(e)) await refreshSummaries(sessionId);
    }
  }
  return { sizes: kept.map(seatsOf), changed };
}

const groupsInput = z.object({
  sessionId: idSchema,
  groups: z.array(z.object({ label: z.string().trim().min(1).max(40), memberIds: z.array(idSchema).max(30) })).min(1).max(20),
});

/**
 * Enregistrer la composition (après modifications à la main). Chaque participant confirmé doit être
 * placé exactement une fois. Si les groupes étaient déjà révélés, les participants déplacés sont prévenus.
 */
export const adminSaveGroups = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = groupsInput.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessRef, s, participants } = await loadSession(parsed.data.sessionId);
  const groups = parsed.data.groups.filter((g) => g.memberIds.length > 0);
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const placed = groups.flatMap((g) => g.memberIds);
  if (placed.some((uid) => !byUid.has(uid))) refuse("unknown_member", "Un membre placé n'a pas de réservation confirmée.");
  if (new Set(placed).size !== placed.length) refuse("duplicate_member", "Un membre est placé deux fois.");
  if (placed.length !== participants.length) refuse("unassigned", "Tous les participants confirmés doivent être placés.");
  const revealed = s.groupsStatus === "revealed";
  const tablesFlow = isTablesFlow((await db.doc(`experiences/${s.experienceId}`).get()).data());
  const ids = await writeGroups(sessRef.id, s.experienceId, groups, revealed ? "revealed" : "validated", byUid, actor.uid, tablesFlow);
  if (revealed) {
    const batch = db.batch();
    groups.forEach((g, i) => {
      for (const uid of g.memberIds) {
        const p = byUid.get(uid)!;
        if (p.reservation.groupId === ids[i]) continue;
        batch.update(db.doc(`reservations/${p.reservationId}`), { groupId: ids[i], updatedAt: FieldValue.serverTimestamp() });
        batch.set(db.collection(`users/${uid}/notifications`).doc(), {
          type: "group_revealed",
          title: { fr: "Votre table a changé", ar: "تغيّرت مائدتك", en: "Your table has changed" },
          body: { fr: `Vous êtes désormais à la ${g.label}.`, ar: `مكانك الآن في ${g.label}.`, en: `You're now at ${g.label}.` },
          link: `/espace/reservations/${p.reservationId}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
    await batch.commit();
    // Plusieurs lieux : une personne qui change de table peut changer de restaurant (docs/22, décision 15).
    const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
    if (e.venue?.revealPolicy === "on_group_reveal") await refreshRevealed(sessRef.id, s.experienceId, e);
    if (tablesFlow) await refreshSummaries(sessRef.id);
  }
  await sessRef.update({ groupsStatus: revealed ? "revealed" : "validated", groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.save", targetType: "session", targetId: sessRef.id, after: { groups: groups.map((g) => ({ label: g.label, size: g.memberIds.length })) } });
  return { ok: true, status: revealed ? "revealed" : "validated" };
});

/**
 * Révéler les groupes (équipe, ou automatiquement à l'heure de la révélation, docs/22 § 17.H). Tables : chacun reçoit
 * le lieu, l'adresse, la cuisine et le résumé de sa table SANS les noms ; les prénoms ne s'affichent qu'après son
 * check-in. Autres activités en équipes : chacun voit son équipe tout de suite. Notification et e-mail.
 */
export const adminRevealGroups = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ sessionId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const out = await revealGroupsCore(parsed.data.sessionId, actor.uid);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.reveal", targetType: "session", targetId: parsed.data.sessionId, after: out });
  return { ok: true, participants: out.participants };
});

/** Profil utile au résumé de table (aucune donnée nominative n'en sort). */
const summaryPerson = (p: Participant) => ({ birthDate: typeof p.user.birthDate === "string" ? p.user.birthDate : null, languages: p.languages, sector: typeof p.user.sector === "string" ? p.user.sector : null, interests: (p.user.interests ?? []) as string[], seats: p.seats });

/** Résumé de la table de chacun (les autres personnes de sa table). */
function summariesOf(participants: Participant[], groupOf: Map<string, { id: string }>): Map<string, TableSummary> {
  const now = new Date();
  return new Map(participants.map((p) => {
    const g = groupOf.get(p.uid)?.id;
    return [p.uid, tableSummary(participants.filter((o) => o.uid !== p.uid && groupOf.get(o.uid)?.id === g).map(summaryPerson), now)];
  }));
}

/** Recalcule le résumé de table de chacun (tables modifiées après la révélation). */
export async function refreshSummaries(sessionId: string) {
  const { participants } = await loadSession(sessionId);
  const groups = await db.collection("groups").where("sessionId", "==", sessionId).get();
  const groupOf = new Map<string, { id: string }>();
  groups.docs.forEach((g) => (g.get("memberIds") as string[]).forEach((uid) => groupOf.set(uid, { id: g.id })));
  const sums = summariesOf(participants, groupOf);
  const batch = db.batch();
  participants.forEach((p) => batch.update(db.doc(`reservations/${p.reservationId}`), { tableSummary: sums.get(p.uid) }));
  await batch.commit();
}

const LANG_FR: Record<string, string> = { fr: "français", ar: "arabe", darija: "darija", en: "anglais", es: "espagnol" };
const LANG_EN: Record<string, string> = { fr: "French", ar: "Arabic", darija: "Darija", en: "English", es: "Spanish" };
const LANG_AR: Record<string, string> = { fr: "الفرنسية", ar: "العربية", darija: "الدارجة", en: "الإنجليزية", es: "الإسبانية" };
/** Résumé lisible dans l'e-mail : nombre de convives, âges, langues. */
function summaryText(t: TableSummary | undefined, locale: string): string | null {
  if (!t || t.others === 0) return null;
  const ages = t.ageMin !== null && t.ageMax !== null ? (t.ageMin === t.ageMax ? `${t.ageMin}` : `${t.ageMin}–${t.ageMax}`) : null;
  const names = locale === "en" ? LANG_EN : locale === "ar" ? LANG_AR : LANG_FR;
  const langs = t.languages.map((l) => names[l] ?? l).join(", ");
  if (locale === "en") return [`${t.others} other guest${t.others > 1 ? "s" : ""}`, ages ? `aged ${ages}` : null, langs ? `speaking ${langs}` : null].filter(Boolean).join(", ");
  if (locale === "ar") return [`${t.others} ضيوف آخرون`, ages ? `بين ${ages} سنة` : null, langs ? `اللغات: ${langs}` : null].filter(Boolean).join("، ");
  return [`${t.others} autre${t.others > 1 ? "s" : ""} convive${t.others > 1 ? "s" : ""}`, ages ? `${ages} ans` : null, langs ? `langues : ${langs}` : null].filter(Boolean).join(", ");
}

const hhmm = (d: Date, locale: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hourCycle: "h23", numberingSystem: "latn" }).format(d);

export async function revealGroupsCore(sessionId: string, actorUid: string): Promise<{ participants: number; groups: number }> {
  const { sessRef, s, e, participants } = await loadSession(sessionId);
  if (s.groupsStatus !== "validated") refuse("not_validated", "Enregistrez d'abord la composition.");
  const groups = await db.collection("groups").where("sessionId", "==", sessRef.id).get();
  const groupOf = new Map<string, { id: string; label: string }>();
  groups.docs.forEach((g) => (g.data().memberIds as string[]).forEach((uid) => groupOf.set(uid, { id: g.id, label: g.data().label })));
  if (participants.some((p) => !groupOf.has(p.uid))) refuse("unassigned", "Des participants confirmés ne sont pas placés.");
  // Lieu secret (docs/22, décision 15) : lieux de la date (un ou plusieurs), sinon lieu habituel ; jamais révélé vide.
  const secret = e.venue?.revealPolicy === "on_group_reveal";
  const found = secret ? await sessionVenues(sessRef.id, s.experienceId, e) : null;
  if (found && (found.venues.length === 0 || found.venues.some((v) => !v.name || !v.address))) refuse("venue_missing", "Renseignez le lieu avant de le révéler.");
  // Lot C (docs/25) : plusieurs restaurants → chaque table va dans celui que ses membres connaissent le moins. Les tables
  // sont renumérotées en conséquence (les lieux suivent l'ordre des tables partout : révélation, récapitulatif aux lieux).
  const labels = new Map(groups.docs.map((g) => [g.id, String(g.data().label ?? "")]));
  if (found && found.venues.length > 1 && groups.size > 1) {
    const sorted = [...groups.docs].sort((a, b) => byTableLabel(String(a.data().label ?? ""), String(b.data().label ?? "")));
    const visited = await visitedVenueKeys(participants.map((p) => p.uid), sessRef.id);
    const slots = assignGroupsToVenues(sorted.length, found.venues);
    const seen = sorted.map((g) => found.venues.map((v) => seenCount(visited, (g.data().memberIds as string[]) ?? [], v)));
    const place = assignTablesAvoidingRepeats(slots, seen);
    const prefix = labelPrefix(e);
    const relabel = db.batch();
    sorted.forEach((g, i) => {
      const next = `${prefix} ${place[i]! + 1}`;
      if (next !== labels.get(g.id)) relabel.update(g.ref, { label: next });
      labels.set(g.id, next);
    });
    await relabel.commit();
  }
  const venueOf = found ? venueByGroup(groups.docs.map((g) => ({ id: g.id, label: labels.get(g.id) ?? "" })), found.venues, found.cuisine, found.cuisineI18n) : null;
  const tablesFlow = isTablesFlow(e);
  const sums = tablesFlow ? summariesOf(participants, groupOf) : null;
  const batch = db.batch();
  groups.docs.forEach((g) => batch.update(g.ref, { status: "revealed", revealedAt: FieldValue.serverTimestamp(), ...(tablesFlow ? { namesAtCheckIn: true } : {}) }));
  for (const p of participants) {
    const g = groupOf.get(p.uid)!;
    const venue = venueOf?.get(g.id);
    batch.update(db.doc(`reservations/${p.reservationId}`), { groupId: g.id, ...(venue ? { venue } : {}), ...(sums ? { tableSummary: sums.get(p.uid) } : {}), updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${p.uid}/notifications`).doc(), tablesFlow
      ? {
          type: "venue_revealed",
          title: { fr: "Votre lieu est révélé", ar: "تم الكشف عن مكانك", en: "Your venue is revealed" },
          body: venue
            ? { fr: `${venue.name}, ${venue.address}. Votre table se découvre au check-in.`, ar: `${venue.name}، ${venue.address}. تكتشف مائدتك عند تسجيل الوصول.`, en: `${venue.name}, ${venue.address}. You'll meet your table at check-in.` }
            : { fr: "Votre table se découvre au check-in.", ar: "تكتشف مائدتك عند تسجيل الوصول.", en: "You'll meet your table at check-in." },
          link: `/espace/reservations/${p.reservationId}`,
          createdAt: FieldValue.serverTimestamp(),
        }
      : {
          type: "group_revealed",
          title: { fr: "Votre équipe est prête", ar: "فريقك جاهز", en: "Your team is ready" },
          body: { fr: `${g.label} : découvrez votre groupe${secret ? " et le lieu" : ""}.`, ar: `${g.label}: اكتشف مجموعتك.`, en: `${g.label}: meet your group${secret ? " and see the venue" : ""}.` },
          link: `/espace/reservations/${p.reservationId}`,
          createdAt: FieldValue.serverTimestamp(),
        });
  }
  batch.update(sessRef, { groupsStatus: "revealed", groupsRevealedAt: FieldValue.serverTimestamp(), groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  const startAt = (s.startAt as Timestamp).toDate();
  const checkInFrom = tablesTimeline(startAt).checkInFrom;
  await Promise.all(
    participants.map(async (p) => {
      if (!p.user.email) return null;
      const locale = String(p.user.locale ?? "fr");
      // Audit 23/11 : invitation agenda à jour (lieu révélé), même identifiant que celle déjà téléchargée.
      const rDoc = (await db.doc(`reservations/${p.reservationId}`).get()).data();
      const attachments = rDoc ? [await icsAttachment(p.reservationId, rDoc, locale)] : [];
      const title = s.experienceSnapshot?.title?.[locale] ?? s.experienceSnapshot?.title?.fr ?? e.title?.fr ?? "";
      const venue = venueOf?.get(groupOf.get(p.uid)!.id);
      if (tablesFlow) {
        const mail = venueRevealedMail({ locale, firstName: String(p.user.firstName ?? ""), title, when: dateTimeFor(startAt, locale), venue: venue ? `${venue.name}, ${venue.address}` : null, cuisine: ((locale === "ar" || locale === "en") && venue?.cuisineI18n?.[locale as "ar" | "en"]) || venue?.cuisine || null, summary: summaryText(sums?.get(p.uid), locale), checkInFrom: hhmm(checkInFrom, locale), reservationId: p.reservationId });
        return sendMail({ to: p.user.email, locale, ...mail, attachments, kind: "venue_revealed", refs: { reservationId: p.reservationId, sessionId: sessRef.id } });
      }
      const mail = groupRevealedMail({ locale, firstName: String(p.user.firstName ?? ""), title, when: dateTimeFor(startAt, locale), table: groupOf.get(p.uid)!.label, venue: venue ? `${venue.name}, ${venue.address}` : null, reservationId: p.reservationId });
      return sendMail({ to: p.user.email, locale, ...mail, attachments, kind: "group_revealed", refs: { reservationId: p.reservationId, sessionId: sessRef.id } });
    }),
  );
  void actorUid;
  return { participants: participants.length, groups: groups.size };
}

export { loadSession };
