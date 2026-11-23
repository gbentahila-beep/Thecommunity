import { getStorage } from "firebase-admin/storage";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";

const ID = /^[A-Za-z0-9_-]{6,40}$/;

/** Une date compte comme « avec des participants » dès qu'il y a des places confirmées, en cours de paiement ou une liste d'attente. */
const hasPeople = (s: FirebaseFirestore.DocumentData) => (s.seatsConfirmed ?? 0) + (s.seatsHeld ?? 0) + (s.waitlistCount ?? 0) > 0;

/**
 * Archiver / réactiver (équipe) ou supprimer (super-admin) une expérience.
 * - Archiver : l'expérience disparaît du site (statut « archived ») ; refusé tant qu'une date à venir a des participants
 *   ou qu'une demande de participation est en attente. Les dates à venir sans participant repassent en brouillon.
 *   L'historique (réservations passées, factures, avis, statistiques) est conservé.
 * - Réactiver : l'expérience repasse en brouillon, à republier depuis sa fiche.
 * - Supprimer : seulement si l'expérience n'a jamais eu de réservation, de demande, de liste d'attente ni d'avis ;
 *   supprime aussi ses dates, ses données internes, ses alertes « prochaines dates » et ses photos.
 */
export const adminExperienceAction = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ experienceId: z.string().regex(ID), action: z.enum(["archive", "activate", "delete"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { experienceId: id, action } = parsed.data;
  const ref = db.doc(`experiences/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Expérience introuvable.", { reason: "not_found" });
  const exp = snap.data()!;
  const title = String(exp.title?.fr ?? "");
  const sessions = await db.collection("sessions").where("experienceId", "==", id).get();
  const now = Date.now();

  if (action === "archive") {
    if (exp.status !== "archived") {
      const upcoming = sessions.docs.filter((s) => (s.data().startAt as Timestamp).toMillis() >= now && s.data().status !== "cancelled");
      const busy = upcoming.filter((s) => hasPeople(s.data()));
      if (busy.length) refuse("upcoming_participants", `${busy.length} date(s) à venir ont des participants : annulez-les d'abord.`);
      const pending = await db.collection("bookingRequests").where("experienceId", "==", id).where("status", "==", "pending").limit(1).get();
      if (!pending.empty) refuse("pending_requests", "Des demandes de participation sont en attente : traitez-les d'abord.");
      const batch = db.batch();
      batch.update(ref, { status: "archived", archivedAt: FieldValue.serverTimestamp(), archivedBy: actor.uid, nextSessionAt: null, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
      for (const s of upcoming) if (s.data().status !== "draft") batch.update(s.ref, { status: "draft" });
      await batch.commit();
    }
  } else if (action === "activate") {
    if (exp.status !== "archived") refuse("not_archived", "Cette expérience n'est pas archivée.");
    await ref.update({ status: "draft", archivedAt: FieldValue.delete(), archivedBy: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  } else {
    if (roleOf(req) !== "superadmin") throw new HttpsError("permission-denied", "Suppression réservée aux super-admins.", { reason: "superadmin_only" });
    const [reservations, requests, reviews] = await Promise.all([
      db.collection("reservations").where("experienceId", "==", id).limit(1).get(),
      db.collection("bookingRequests").where("experienceId", "==", id).limit(1).get(),
      db.collection("reviews").where("experienceId", "==", id).limit(1).get(),
    ]);
    if (!reservations.empty || !requests.empty || !reviews.empty || sessions.docs.some((s) => hasPeople(s.data()))) {
      refuse("has_history", "Cette expérience a déjà eu des participants : archivez-la plutôt.");
    }
    const alerts = await db.collection("experienceAlerts").where("experienceId", "==", id).get();
    for (const s of sessions.docs) await db.recursiveDelete(s.ref);
    for (const a of alerts.docs) await a.ref.delete();
    await db.recursiveDelete(ref); // supprime aussi private/economics
    await getStorage().bucket().deleteFiles({ prefix: `experiences/${id}/` }).catch(() => undefined);
  }

  await audit({
    actorUid: actor.uid,
    actorRole: roleOf(req),
    action: `experience.${action}`,
    targetType: "experience",
    targetId: id,
    before: { title, status: exp.status, sessions: sessions.size },
  });
  return { ok: true };
});
