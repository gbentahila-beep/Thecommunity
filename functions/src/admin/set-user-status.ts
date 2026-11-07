import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";

const input = z.object({ uid: z.string().min(1).max(128), status: z.enum(["active", "suspended"]), reason: z.string().max(300).optional() });

/**
 * Suspend ou réactive un compte (signalement, abus). Le compte suspendu ne peut plus se connecter
 * et ses sessions sont révoquées. Un admin ne peut pas suspendre un membre de l'équipe.
 */
export const adminSetUserStatus = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = input.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { uid, status, reason } = parsed.data;
  if (uid === actor.uid) throw new HttpsError("failed-precondition", "Vous ne pouvez pas suspendre votre propre compte.");
  const target = await auth.getUser(uid).catch(() => {
    throw new HttpsError("not-found", "Utilisateur introuvable.");
  });
  const targetRole = (target.customClaims?.role as string | undefined) ?? "user";
  if (targetRole !== "user" && roleOf(req) !== "superadmin") {
    throw new HttpsError("permission-denied", "Seul un super-admin peut suspendre un membre de l'équipe.");
  }
  await auth.updateUser(uid, { disabled: status === "suspended" });
  if (status === "suspended") await auth.revokeRefreshTokens(uid);
  await db.doc(`users/${uid}`).set({ status, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "user.setStatus", targetType: "user", targetId: uid, before: target.disabled ? "suspended" : "active", after: { status, reason: reason ?? null } });
  return { ok: true, status };
});
