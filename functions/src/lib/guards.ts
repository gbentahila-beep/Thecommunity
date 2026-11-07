import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";

export type Role = "user" | "organizer" | "admin" | "superadmin";

/** Utilisateur connecté obligatoire. */
export function requireAuth(req: CallableRequest<unknown>) {
  if (!req.auth) throw new HttpsError("unauthenticated", "Connexion requise.");
  return req.auth;
}

/** Rôle lu dans le custom claim du jeton (posé uniquement par le serveur). */
export function roleOf(req: CallableRequest<unknown>): Role {
  const role = req.auth?.token.role;
  return role === "organizer" || role === "admin" || role === "superadmin" ? role : "user";
}

export function requireRole(req: CallableRequest<unknown>, allowed: Role[]) {
  const a = requireAuth(req);
  if (!allowed.includes(roleOf(req))) throw new HttpsError("permission-denied", "Action réservée à l'équipe.");
  return a;
}

/** Convertit une erreur de validation Zod en erreur lisible côté client. */
export function invalidArgument(issues: { path: PropertyKey[]; message: string }[]): never {
  throw new HttpsError("invalid-argument", "Données invalides.", {
    issues: issues.map((i) => ({ path: i.path.map(String).join("."), message: i.message })),
  });
}
