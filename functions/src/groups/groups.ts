import { ageOn, composeGroups, pairKey, type MatchPerson } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { dateTimeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { groupRevealedMail } from "../mail/templates";
import { refuse } from "../reservations/refuse";

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
async function writeGroups(sessionId: string, experienceId: string, groups: { label: string; memberIds: string[] }[], status: "proposed" | "validated" | "revealed", byUid: Map<string, Participant>, actorUid: string) {
  const old = await db.collection("groups").where("sessionId", "==", sessionId).get();
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
  const { sessRef, s, e, participants } = await loadSession(parsed.data.sessionId);
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
  }));
  const groups = composeGroups(people, e.groupConfig, { pastPairs: await pastPairs(people.map((p) => p.uid), sessRef.id) });
  const byUid = new Map(participants.map((p) => [p.uid, p]));
  const prefix = labelPrefix(e);
  await writeGroups(sessRef.id, s.experienceId, groups.map((m, i) => ({ label: `${prefix} ${i + 1}`, memberIds: m })), "proposed", byUid, actor.uid);
  await sessRef.update({ groupsStatus: "proposed", groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.propose", targetType: "session", targetId: sessRef.id, after: { groups: groups.length, participants: participants.length } });
  return { groups: groups.length };
});

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
  const ids = await writeGroups(sessRef.id, s.experienceId, groups, revealed ? "revealed" : "validated", byUid, actor.uid);
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
  }
  await sessRef.update({ groupsStatus: revealed ? "revealed" : "validated", groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.save", targetType: "session", targetId: sessRef.id, after: { groups: groups.map((g) => ({ label: g.label, size: g.memberIds.length })) } });
  return { ok: true, status: revealed ? "revealed" : "validated" };
});

/**
 * Révéler les groupes : chaque participant voit sa table (prénoms et centres d'intérêt), reçoit une
 * notification et un e-mail ; le lieu exact est communiqué pour les expériences « révélé avec le groupe ».
 */
export const adminRevealGroups = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ sessionId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessRef, s, e, participants } = await loadSession(parsed.data.sessionId);
  if (s.groupsStatus !== "validated") refuse("not_validated", "Enregistrez d'abord la composition.");
  const groups = await db.collection("groups").where("sessionId", "==", sessRef.id).get();
  const groupOf = new Map<string, { id: string; label: string }>();
  groups.docs.forEach((g) => (g.data().memberIds as string[]).forEach((uid) => groupOf.set(uid, { id: g.id, label: g.data().label })));
  if (participants.some((p) => !groupOf.has(p.uid))) refuse("unassigned", "Des participants confirmés ne sont pas placés.");
  const venue = e.venue?.revealPolicy === "on_group_reveal" ? { name: e.venue.name ?? "", address: e.venue.address ?? "" } : null;
  const batch = db.batch();
  groups.docs.forEach((g) => batch.update(g.ref, { status: "revealed", revealedAt: FieldValue.serverTimestamp() }));
  for (const p of participants) {
    const g = groupOf.get(p.uid)!;
    batch.update(db.doc(`reservations/${p.reservationId}`), { groupId: g.id, ...(venue ? { venue } : {}), updatedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${p.uid}/notifications`).doc(), {
      type: "group_revealed",
      title: { fr: "Votre table est prête", ar: "مائدتك جاهزة", en: "Your table is ready" },
      body: { fr: `${g.label} : découvrez votre groupe${venue ? " et le lieu" : ""}.`, ar: `${g.label}: اكتشف مجموعتك.`, en: `${g.label}: meet your group${venue ? " and see the venue" : ""}.` },
      link: `/espace/reservations/${p.reservationId}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  batch.update(sessRef, { groupsStatus: "revealed", groupsRevealedAt: FieldValue.serverTimestamp(), groupsNeedReview: false, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  const startAt = (s.startAt as Timestamp).toDate();
  await Promise.all(
    participants.map((p) => {
      const locale = String(p.user.locale ?? "fr");
      const title = s.experienceSnapshot?.title?.[locale] ?? s.experienceSnapshot?.title?.fr ?? e.title?.fr ?? "";
      const mail = groupRevealedMail({ locale, firstName: String(p.user.firstName ?? ""), title, when: dateTimeFor(startAt, locale), table: groupOf.get(p.uid)!.label, venue: venue ? `${venue.name}, ${venue.address}` : null, reservationId: p.reservationId });
      return p.user.email ? sendMail({ to: p.user.email, locale, ...mail, kind: "group_revealed", refs: { reservationId: p.reservationId, sessionId: sessRef.id } }) : null;
    }),
  );
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "groups.reveal", targetType: "session", targetId: sessRef.id, after: { participants: participants.length, groups: groups.size } });
  return { ok: true, participants: participants.length };
});

/** Fiche hôte : qui accueille et le déroulé de la soirée (équipe). */
export const adminSaveHosting = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const parsed = z.object({ sessionId: idSchema, hostName: z.string().trim().max(80), notes: z.string().trim().max(2000) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`sessions/${parsed.data.sessionId}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  await ref.update({ hosting: { hostName: parsed.data.hostName, notes: parsed.data.notes, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid } });
  return { ok: true };
});
