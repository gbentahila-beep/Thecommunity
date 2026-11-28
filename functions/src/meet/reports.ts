import { REPORT_ESCALATION_DAYS, REPORT_ESCALATION_REPORTERS, reportWindowOpen } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { sendMail } from "../mail/mailer";
import { reportReceivedMail } from "../mail/member-templates";
import { teamAlertMail } from "../mail/templates";
import { personOf } from "../notify/reminders";
import { refuse } from "../reservations/refuse";
import { teamAlert } from "../tables/team";

const id = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const REPORT_REASONS = ["behaviour", "harassment", "safety", "other"] as const;
const details = z.string().trim().min(5, "tooShort").max(1000, "tooLong");

/** Réservations d'une date qui comptent pour un signalement (la personne était inscrite, même si elle a été retirée depuis). */
const PRESENT = ["confirmed", "attended", "no_show", "cancelled", "refunded"];

type ReportInput = { reporterUid: string; reportedUid: string | null; sessionId: string; reservationId: string | null; groupId: string | null; reason: (typeof REPORT_REASONS)[number]; details: string; title: string; live: boolean };

/**
 * Cœur commun des signalements (audit du 23/11) : enregistrement privé (équipe seulement), alerte à l'équipe,
 * accusé de réception à la personne qui signale (notification + e-mail), puis gel du compte signalé quand
 * 2 personnes différentes l'ont signalé en 90 jours : plus de nouvelle réservation tant que l'équipe n'a pas tranché.
 */
async function recordReport(o: ReportInput) {
  if (o.reportedUid) {
    const dup = await db.collection("reports").where("reporterUid", "==", o.reporterUid).where("sessionId", "==", o.sessionId).get();
    if (dup.docs.some((d) => d.get("reportedUid") === o.reportedUid && d.get("status") === "open")) refuse("already_reported", "Vous avez déjà signalé cette personne.");
  }
  const ref = db.collection("reports").doc();
  await ref.set({
    reporterUid: o.reporterUid,
    reportedUid: o.reportedUid,
    groupId: o.groupId,
    sessionId: o.sessionId,
    reservationId: o.reservationId,
    reason: o.reason,
    details: o.details,
    duringEvent: o.live,
    status: "open",
    createdAt: FieldValue.serverTimestamp(),
  });
  await teamAlert({
    sessionId: o.sessionId,
    key: `report_${ref.id}`,
    subject: o.live ? "URGENT — signalement pendant une expérience" : "Signalement d'un participant",
    paragraphs: [o.live ? `Un participant de « ${o.title} » signale un problème PENDANT l'expérience (${o.reason}).` : `Un participant de « ${o.title} » a signalé une personne (${o.reason}).`, "Le détail est dans le back-office (Signalements)."],
    path: "/admin/signalements",
  }).catch(() => undefined);
  // Accusé de réception (jamais le nom de la personne signalée).
  const p = await personOf(o.reporterUid);
  await db.collection(`users/${o.reporterUid}/notifications`).add({
    type: "report_received",
    title: { fr: "Signalement reçu", ar: "تم استلام البلاغ", en: "Report received" },
    body: { fr: "Merci. L'équipe le lit au plus vite (objectif : 48 h) ; il reste confidentiel.", ar: "شكرًا. يقرؤه الفريق في أسرع وقت ويبقى سريًا.", en: "Thank you. The team reads it as soon as possible (target: 48 h); it stays confidential." },
    link: o.reservationId ? `/espace/reservations/${o.reservationId}` : "/espace",
    createdAt: FieldValue.serverTimestamp(),
  });
  if (p.email) await sendMail({ to: p.email, locale: p.locale, ...reportReceivedMail({ locale: p.locale, firstName: p.firstName, title: o.title }), kind: "report_received", refs: { reportId: ref.id } }).catch(() => undefined);
  if (o.reportedUid) await escalate(o.reportedUid).catch((e) => logger.error("Gel après signalements", e));
  await audit({ actorUid: o.reporterUid, actorRole: "user", action: "report.create", targetType: "user", targetId: o.reportedUid ?? "unknown", after: { reason: o.reason, reportId: ref.id, sessionId: o.sessionId } });
  return ref.id;
}

/** Gel du compte signalé par au moins 2 personnes différentes sur 90 jours (signalements non classés sans suite). */
export async function escalate(reportedUid: string, now = Date.now()): Promise<boolean> {
  const since = Timestamp.fromMillis(now - REPORT_ESCALATION_DAYS * 86_400_000);
  const snap = await db.collection("reports").where("reportedUid", "==", reportedUid).where("createdAt", ">=", since).get();
  const reporters = new Set(snap.docs.filter((d) => d.get("status") !== "dismissed").map((d) => String(d.get("reporterUid"))));
  if (reporters.size < REPORT_ESCALATION_REPORTERS) return false;
  const userRef = db.doc(`users/${reportedUid}`);
  const frozen = await db.runTransaction(async (tx) => {
    const u = (await tx.get(userRef)).data();
    if (u?.bookingHold?.active === true) return false;
    tx.set(userRef, { bookingHold: { active: true, reason: "reports", at: Timestamp.fromMillis(now), reportIds: snap.docs.map((d) => d.id) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!frozen) return false;
  const team = await db.collection("users").where("role", "in", ["admin", "superadmin"]).limit(20).get();
  const mail = teamAlertMail({ subject: "Compte gelé après plusieurs signalements", paragraphs: [`${reporters.size} personnes différentes ont signalé le même membre en ${REPORT_ESCALATION_DAYS} jours.`, "Son compte ne peut plus réserver. Ses réservations à venir sont maintenues : à vous de décider (annuler, suspendre ou lever le gel)."], path: "/admin/signalements" });
  await Promise.all(team.docs.map((u) => u.get("email") as string | undefined).filter((e): e is string => Boolean(e)).map((to) => sendMail({ to, locale: "fr", ...mail, kind: "team_alert", refs: { userId: reportedUid } }).catch(() => undefined)));
  await audit({ actorUid: "system", actorRole: "system", action: "user.bookingHold", targetType: "user", targetId: reportedUid, after: { reporters: reporters.size } });
  return true;
}

/**
 * Signaler une personne depuis sa RÉSERVATION (audit du 23/11) : pendant l'expérience comme après, pour tous les
 * formats (table, équipe, atelier, sortie). La personne est choisie parmi celles de sa table/son groupe quand on les
 * connaît, sinon décrite dans le message (`otherUid` absent) : l'équipe l'identifie.
 */
export const reportFromReservation = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = z.object({ reservationId: id, otherUid: id.optional().or(z.literal("")), reason: z.enum(REPORT_REASONS), details }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const r = (await db.doc(`reservations/${v.data.reservationId}`).get()).data();
  if (!r || r.userId !== uid || !PRESENT.includes(String(r.status))) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  const startAt = (r.sessionSnapshot.startAt as Timestamp).toDate().toISOString();
  const endAt = (r.sessionSnapshot.endAt as Timestamp).toDate().toISOString();
  if (!reportWindowOpen(startAt, endAt)) refuse("report_window", "Le signalement s'ouvre 1 h avant l'expérience et reste possible 30 jours après.");
  const other = v.data.otherUid || null;
  if (other) {
    if (other === uid) invalidArgument([{ path: ["otherUid"], message: "invalid" }]);
    const theirs = await db.collection("reservations").where("sessionId", "==", r.sessionId).where("userId", "==", other).get();
    if (!theirs.docs.some((d) => PRESENT.includes(String(d.get("status"))))) throw new HttpsError("not-found", "Personne introuvable.", { reason: "not_found" });
  }
  const reportId = await recordReport({
    reporterUid: uid, reportedUid: other, sessionId: r.sessionId, reservationId: v.data.reservationId, groupId: (r.groupId as string | undefined) ?? null,
    reason: v.data.reason, details: v.data.details, title: String(r.sessionSnapshot?.title?.fr ?? ""), live: Date.now() < new Date(endAt).getTime(),
  });
  return { ok: true, reportId };
});

/**
 * Signaler une personne rencontrée (docs/22, décision 48) depuis « Mes rencontres » : quelqu'un de sa table ou de son groupe.
 * Même traitement que depuis la réservation (accusé, alerte, gel après 2 personnes).
 */
export const reportParticipant = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = z.object({ groupId: id, otherUid: id, reason: z.enum(REPORT_REASONS), details }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const g = (await db.doc(`groups/${v.data.groupId}`).get()).data();
  const members = [...((g?.memberIds as string[] | undefined) ?? []), ...((g?.removedUids as string[] | undefined) ?? [])];
  if (!g || !((g.memberIds as string[] | undefined) ?? []).includes(uid) || !members.includes(v.data.otherUid) || uid === v.data.otherUid) throw new HttpsError("not-found", "Groupe introuvable.", { reason: "not_found" });
  const mine = await db.collection("reservations").where("sessionId", "==", g.sessionId).where("userId", "==", uid).limit(1).get();
  const s = (await db.doc(`sessions/${g.sessionId}`).get()).data();
  const endAt = (s?.endAt as Timestamp | undefined)?.toMillis() ?? 0;
  const reportId = await recordReport({
    reporterUid: uid, reportedUid: v.data.otherUid, sessionId: g.sessionId, reservationId: mine.docs[0]?.id ?? null, groupId: v.data.groupId,
    reason: v.data.reason, details: v.data.details, title: String(s?.experienceSnapshot?.title?.fr ?? ""), live: Date.now() < endAt,
  });
  return { ok: true, reportId };
});

/** Équipe : clôturer un signalement (traité ou sans suite), avec une note interne. Journalisé. */
export const adminResolveReport = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = z.object({ reportId: id, status: z.enum(["resolved", "dismissed"]), note: z.string().trim().max(1000).default("") }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`reports/${v.data.reportId}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Signalement introuvable.", { reason: "not_found" });
  await ref.update({ status: v.data.status, note: v.data.note, resolvedBy: actor.uid, resolvedAt: FieldValue.serverTimestamp() });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `report.${v.data.status}`, targetType: "report", targetId: ref.id, after: { note: v.data.note } });
  return { ok: true };
});

/** Équipe : geler ou lever le gel des réservations d'un compte (après examen des signalements). Journalisé. */
export const adminSetBookingHold = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = z.object({ uid: id, active: z.boolean(), note: z.string().trim().max(300).default("") }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  await db.doc(`users/${v.data.uid}`).set({
    bookingHold: v.data.active ? { active: true, reason: "team", at: FieldValue.serverTimestamp(), by: actor.uid, note: v.data.note } : { active: false, liftedAt: FieldValue.serverTimestamp(), liftedBy: actor.uid, note: v.data.note },
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: v.data.active ? "user.bookingHold" : "user.bookingHold.lift", targetType: "user", targetId: v.data.uid, after: { note: v.data.note } });
  return { ok: true };
});
