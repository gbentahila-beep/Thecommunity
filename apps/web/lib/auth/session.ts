import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED, SESSION_COOKIE } from "@/lib/firebase/config";

export type SessionUser = {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: "user" | "organizer" | "admin" | "superadmin";
};

/**
 * Utilisateur connecté, vérifié côté serveur à partir du cookie de session httpOnly.
 * La révocation est contrôlée (changement de rôle, suspension, déconnexion partout).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!FIREBASE_ENABLED) return null;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const t = await adminAuth().verifySessionCookie(cookie, true);
    const role = t.role === "organizer" || t.role === "admin" || t.role === "superadmin" ? t.role : "user";
    return { uid: t.uid, email: t.email ?? null, emailVerified: Boolean(t.email_verified), role };
  } catch {
    return null;
  }
}

/** Statut du compte (suspendu ?) et questionnaire terminé ? — lus dans le profil privé. */
export async function getAccountState(uid: string) {
  const snap = await adminDb().doc(`users/${uid}`).get();
  const d = snap.data() ?? {};
  return { exists: snap.exists, onboardingCompleted: Boolean(d.onboardingCompleted), suspended: d.status === "suspended" };
}
