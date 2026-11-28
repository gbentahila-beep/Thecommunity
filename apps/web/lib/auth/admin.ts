import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/**
 * Accès au back-office : rôle admin ou superadmin (custom claim vérifié côté serveur).
 * Non connecté → page de connexion ; connecté sans rôle → 404 (on ne révèle pas l'existence du back-office).
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/connexion?suite=/admin");
  if (user.role !== "admin" && user.role !== "superadmin") notFound();
  return user;
}
