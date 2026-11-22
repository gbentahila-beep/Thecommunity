import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { teamAlert } from "../tables/team";

const id = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const REPORT_REASONS = ["behaviour", "harassment", "safety", "other"] as const;

/**
 * Signaler une personne rencontrée (docs/22, décision 48) : seulement quelqu'un de sa table ou de son groupe.
 * Le signalement reste privé (équipe seulement) ; l'équipe est prévenue. Journalisé.
 */
export const reportParticipant = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = z.object({ groupId: id, otherUid: id, reason: z.enum(REPORT_REASONS), details: z.string().trim().min(5, "tooShort").max(1000, "tooLong") }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const g = (await db.doc(`groups/${v.data.groupId}`).get()).data();
  const members = (g?.memberIds as string[] | undefined) ?? [];
  if (!g || !members.includes(uid) || !members.includes(v.data.otherUid) || uid === v.data.otherUid) throw new HttpsError("not-found", "Groupe introuvable.", { reason: "not_found" });
  const dup = await db.collection("reports").where("reporterUid", "==", uid).where("groupId", "==", v.data.groupId).get();
  if (dup.docs.some((d) => d.get("reportedUid") === v.data.otherUid && d.get("status") === "open")) refuse("already_reported", "Vous avez déjà signalé cette personne.");
  const ref = db.collection("reports").doc();
  await ref.set({ reporterUid: uid, reportedUid: v.data.otherUid, groupId: v.data.groupId, sessionId: g.sessionId ?? null, reason: v.data.reason, details: v.data.details, status: "open", createdAt: FieldValue.serverTimestamp() });
  if (g.sessionId) await teamAlert({ sessionId: g.sessionId, key: `report_${ref.id}`, subject: "Signalement d'un participant", paragraphs: ["Un participant a signalé une personne de sa table. Le détail est dans le back-office (Signalements)."], path: "/admin/signalements" }).catch(() => undefined);
  await audit({ actorUid: uid, actorRole: "user", action: "report.create", targetType: "user", targetId: v.data.otherUid, after: { reason: v.data.reason, reportId: ref.id } });
  return { ok: true };
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
