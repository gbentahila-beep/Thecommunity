import { onCall, HttpsError } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";

const input = z.object({
  uid: z.string().min(1).max(128),
  role: z.enum(["user", "organizer", "admin", "superadmin"]),
});

/**
 * Attribue un rôle (custom claim). Réservé au super-admin, journalisé.
 * Les jetons de l'utilisateur sont révoqués pour que le changement s'applique immédiatement.
 */
export const setUserRole = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = input.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { uid, role } = parsed.data;
  if (uid === actor.uid && role !== "superadmin") {
    throw new HttpsError("failed-precondition", "Un super-admin ne peut pas se retirer ses propres droits.");
  }
  const target = await auth.getUser(uid).catch(() => {
    throw new HttpsError("not-found", "Utilisateur introuvable.");
  });
  const before = (target.customClaims?.role as string | undefined) ?? "user";
  await auth.setCustomUserClaims(uid, { ...(target.customClaims ?? {}), role: role === "user" ? undefined : role });
  await auth.revokeRefreshTokens(uid);
  await db.doc(`users/${uid}`).set({ role, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "user.setRole", targetType: "user", targetId: uid, before, after: role });
  return { ok: true, role };
});
