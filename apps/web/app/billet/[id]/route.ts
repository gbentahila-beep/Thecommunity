import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

/**
 * Étape 20 — adresse du QR code des billets. Selon la personne connectée : l'équipe ouvre la fiche du billet du
 * back-office, l'organisateur de l'activité celle de son espace, le participant sa réservation. Personne d'autre
 * n'apprend quoi que ce soit (renvoi vers la connexion ou l'espace membre).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/billet/[id]">) {
  const { id } = await ctx.params;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const safe = encodeURIComponent(id);
  if (!FIREBASE_ENABLED) return to(`/admin/billets/${safe}`);
  const user = await getSessionUser();
  if (!user) return to(`/connexion?suite=${encodeURIComponent(`/billet/${safe}`)}`);
  if (user.role === "admin" || user.role === "superadmin") return to(`/admin/billets/${safe}`);
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return to("/espace");
  const db = adminDb();
  const [res, me] = await Promise.all([db.doc(`reservations/${id}`).get(), db.doc(`users/${user.uid}`).get()]);
  const orgId = me.get("organizerId") as string | undefined;
  if (res.exists && orgId && res.get("organizerId") === orgId) return to(`/pro/billets/${safe}`);
  if (res.exists && res.get("userId") === user.uid) return to(`/espace/reservations/${safe}`);
  return to("/espace");
}
