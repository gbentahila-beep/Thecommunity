import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { db } from "../lib/admin";
import { requireAuth, roleOf } from "../lib/guards";

/**
 * Étape 19 : accès d'un organisateur. Lu dans Firestore à chaque appel (pas seulement dans le jeton) :
 * un compte suspendu ou retiré perd l'accès tout de suite, même avec un ancien jeton.
 * `approvedOnly` : actions réservées aux comptes validés (publier, gérer des dates, voir les réservations).
 */
export async function requireOrganizer(req: CallableRequest<unknown>, opts: { approvedOnly?: boolean } = {}) {
  const auth = requireAuth(req);
  const user = await db.doc(`users/${auth.uid}`).get();
  const orgId = user.get("organizerId") as string | undefined;
  if (!orgId) throw new HttpsError("permission-denied", "Espace réservé aux organisateurs.", { reason: "not_organizer" });
  const [org, details] = await Promise.all([db.doc(`organizers/${orgId}`).get(), db.doc(`organizers/${orgId}/private/details`).get()]);
  const members = (details.get("memberUids") as string[] | undefined) ?? [];
  if (!org.exists || !members.includes(auth.uid)) throw new HttpsError("permission-denied", "Espace réservé aux organisateurs.", { reason: "not_organizer" });
  const status = org.get("status") as string;
  if (opts.approvedOnly && status !== "approved") {
    throw new HttpsError("failed-precondition", "Votre compte organisateur n'est pas (ou plus) validé.", { reason: `organizer_${status}` });
  }
  return { uid: auth.uid, orgId, status, org: org.data()!, details: details.data() ?? {} };
}

/**
 * Étape 20 : action permise à l'équipe (admin, super-admin) ou à l'organisateur validé dont c'est l'activité
 * (annuler une date, pointer, décider d'une demande). L'organisateur ne touche jamais une autre activité.
 */
export async function requireTeamOrOrganizerOf(req: CallableRequest<unknown>, organizerId: string | null | undefined) {
  const auth = requireAuth(req);
  const role = roleOf(req);
  if (role === "admin" || role === "superadmin") return { uid: auth.uid, role: role as string };
  // Ni équipe ni organisateur : même refus qu'avant l'étape 20 (on ne révèle rien).
  const o = await requireOrganizer(req, { approvedOnly: true }).catch((e: HttpsError) => {
    if ((e.details as { reason?: string } | undefined)?.reason === "not_organizer") throw new HttpsError("permission-denied", "Action réservée à l'équipe.");
    throw e;
  });
  if (!organizerId || o.orgId !== organizerId) throw new HttpsError("permission-denied", "Action réservée à l'équipe.", { reason: "not_owner" });
  return { uid: o.uid, role: "organizer" };
}
