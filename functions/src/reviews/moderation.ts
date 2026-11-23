import {
  REVIEW_REPORT_LABELS,
  reviewPhotoDecisionSchema,
  reviewReplySchema,
  reviewReportsDecisionSchema,
  reviewReportSchema,
  type ReviewHistoryAction,
} from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { requireTeamOrOrganizerOf } from "../organizers/access";
import { refuse } from "../reservations/refuse";

/**
 * Étape 24 — avis : réponse publique (organisateur de l'activité ou équipe), signalement (membres, organisateur),
 * traitement des signalements et des photos par l'équipe. Chaque action est ajoutée à l'historique de l'avis
 * (reviews/{id}/private/history, lu par l'équipe seulement) et journalisée.
 */

type Byrole = "member" | "organizer" | "team" | "system";
export async function addHistory(reviewId: string, action: ReviewHistoryAction, byRole: Byrole, byName?: string, note?: string) {
  const event = { action, at: Timestamp.now(), byRole, ...(byName ? { byName } : {}), ...(note ? { note } : {}) };
  await db.doc(`reviews/${reviewId}/private/history`).set({ events: FieldValue.arrayUnion(event) }, { merge: true });
  await db.doc(`reviews/${reviewId}`).update({ historyCount: FieldValue.increment(1) });
}

async function notify(uid: string | undefined, type: string, fr: string, en: string, ar: string, link: string) {
  if (!uid) return;
  await db.collection(`users/${uid}/notifications`).add({ type, title: { fr: "Votre avis", en: "Your review", ar: "رأيك" }, body: { fr, en, ar }, link, createdAt: FieldValue.serverTimestamp() });
}

async function loadReview(reviewId: string) {
  const snap = await db.doc(`reviews/${reviewId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Avis introuvable.", { reason: "not_found" });
  const r = snap.data()!;
  const exp = (await db.doc(`experiences/${r.experienceId}`).get()).data() ?? {};
  return { ref: snap.ref, r, exp };
}

/** Réponse publique à un avis publié : l'organisateur de l'activité, ou l'équipe. Texte vide = réponse retirée. */
export const replyToReview = onCall({ region: REGION }, async (req) => {
  const parsed = reviewReplySchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reviewId, text } = parsed.data;
  const { ref, r, exp } = await loadReview(reviewId);
  const who = await requireTeamOrOrganizerOf(req, (exp.organizerId as string | undefined) ?? null);
  if (r.status !== "published") refuse("not_published", "On ne répond qu'à un avis publié.");
  const team = who.role !== "organizer";
  const authorName = team ? "L'équipe Wenzy" : String((await db.doc(`organizers/${exp.organizerId}`).get()).get("name") ?? "L'organisateur");
  if (!text) {
    await ref.update({ reply: FieldValue.delete() });
    await addHistory(reviewId, "reply_removed", team ? "team" : "organizer", authorName);
  } else {
    const isNew = !r.reply;
    await ref.update({ reply: { text, authorName, authorRole: team ? "team" : "organizer", at: Timestamp.now() } });
    await addHistory(reviewId, "reply", team ? "team" : "organizer", authorName, text.slice(0, 200));
    const slug = String(exp.slug ?? "");
    if (isNew) await notify(r.userId, "review_reply", `${authorName} a répondu à votre avis.`, `${authorName} replied to your review.`, `ردّ ${authorName} على رأيك.`, `/experiences/${slug}#avis`);
  }
  await audit({ actorUid: who.uid, actorRole: roleOf(req), action: text ? "review.reply" : "review.reply_remove", targetType: "review", targetId: reviewId });
  return { ok: true };
});

/** Signaler un avis (une fois par personne). L'avis reste visible : l'équipe décide (pas de masquage automatique). */
export const reportReview = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = reviewReportSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reviewId, reason, message } = parsed.data;
  const { ref, r, exp } = await loadReview(reviewId);
  if (r.status !== "published") refuse("not_published", "Cet avis n'est plus publié.");
  if (r.userId === uid) refuse("own_review", "Vous ne pouvez pas signaler votre propre avis.");
  // Organisateur de l'activité : rattachement lu côté serveur (users/{uid}.organizerId), comme pour l'espace /pro.
  const isOrganizer = Boolean(exp.organizerId) && (await db.doc(`users/${uid}`).get()).get("organizerId") === exp.organizerId;
  const reportRef = db.doc(`reviews/${reviewId}/reports/${uid}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(reportRef)).exists) refuse("already_reported", "Vous avez déjà signalé cet avis.");
    tx.create(reportRef, { uid, reason, message: message || null, byOrganizer: isOrganizer, status: "open", createdAt: FieldValue.serverTimestamp() });
    tx.update(ref, { reportCount: FieldValue.increment(1), reportsOpen: FieldValue.increment(1) });
  });
  await addHistory(reviewId, "reported", isOrganizer ? "organizer" : "member", undefined, `${REVIEW_REPORT_LABELS[reason]}${message ? ` — ${message.slice(0, 200)}` : ""}`);
  await audit({ actorUid: uid, actorRole: roleOf(req), action: "review.report", targetType: "review", targetId: reviewId, after: { reason } });
  return { ok: true };
});

/** Masquer ou republier un avis dans une transaction (note moyenne de l'expérience recalculée). */
export async function setReviewStatus(reviewId: string, status: "published" | "hidden", actorUid: string) {
  return db.runTransaction(async (tx) => {
    const ref = db.doc(`reviews/${reviewId}`);
    const rv = (await tx.get(ref)).data();
    if (!rv) throw new HttpsError("not-found", "Avis introuvable.", { reason: "not_found" });
    if (rv.status === status) return false;
    const expRef = db.doc(`experiences/${rv.experienceId}`);
    const e = (await tx.get(expRef)).data() ?? {};
    // Audit 23/11 : un avis « en attente » ne comptait pas encore : le masquer ne change rien à la note.
    if (rv.status === "pending" && status === "hidden") {
      tx.update(ref, { status, moderatedBy: actorUid, moderatedAt: FieldValue.serverTimestamp() });
      return true;
    }
    const sign = status === "hidden" ? -1 : 1;
    const count = Math.max(0, ((e.ratingCount as number) ?? 0) + sign);
    const sum = Math.max(0, ((e.ratingSum as number) ?? ((e.ratingAvg as number) ?? 0) * ((e.ratingCount as number) ?? 0)) + sign * (rv.rating as number));
    tx.update(ref, { status, moderatedBy: actorUid, moderatedAt: FieldValue.serverTimestamp() });
    tx.update(expRef, { ratingCount: count, ratingSum: sum, ratingAvg: count ? Math.round((sum / count) * 100) / 100 : 0 });
    return true;
  });
}

/** Équipe : traiter les signalements d'un avis (le garder ou le masquer). */
export const adminResolveReviewReports = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = reviewReportsDecisionSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reviewId, outcome, note } = parsed.data;
  const { ref } = await loadReview(reviewId);
  const open = await db.collection(`reviews/${reviewId}/reports`).where("status", "==", "open").get();
  const batch = db.batch();
  open.docs.forEach((d) => batch.update(d.ref, { status: outcome === "hide" ? "upheld" : "dismissed", resolvedAt: FieldValue.serverTimestamp(), resolvedBy: actor.uid }));
  batch.update(ref, { reportsOpen: 0 });
  await batch.commit();
  if (outcome === "hide") await setReviewStatus(reviewId, "hidden", actor.uid);
  await addHistory(reviewId, outcome === "hide" ? "hidden" : "reports_kept", "team", undefined, note || undefined);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `review.reports_${outcome}`, targetType: "review", targetId: reviewId, after: { reports: open.size } });
  return { ok: true, resolved: open.size };
});

/** Équipe : accepter (publier) ou refuser la photo d'un avis. */
export const adminDecideReviewPhoto = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = reviewPhotoDecisionSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reviewId, decision, note } = parsed.data;
  const { ref, r, exp } = await loadReview(reviewId);
  if (r.photo?.status !== "pending") refuse("no_pending_photo", "Aucune photo à vérifier sur cet avis.");
  const bucket = getStorage().bucket();
  const from = String(r.photo.path);
  if (decision === "approve") {
    const ext = (from.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z]/g, "") || "jpg";
    const to = `reviews/${reviewId}/photo-${Date.now()}.${ext}`;
    await bucket.file(from).copy(bucket.file(to));
    await bucket.file(from).delete().catch(() => undefined);
    await ref.update({ photo: { path: to, status: "approved" } });
    await notify(r.userId, "review_photo_approved", "Votre photo est publiée avec votre avis.", "Your photo is now published with your review.", "نُشرت صورتك مع رأيك.", `/experiences/${String(exp.slug ?? "")}#avis`);
  } else {
    await bucket.file(from).delete().catch(() => undefined);
    await ref.update({ photo: { path: "", status: "rejected" } });
    await notify(r.userId, "review_photo_rejected", `Votre photo n'a pas été publiée : ${note}`, `Your photo was not published: ${note}`, `لم تُنشر صورتك: ${note}`, `/espace/reservations/${reviewId}`);
  }
  await addHistory(reviewId, decision === "approve" ? "photo_approved" : "photo_rejected", "team", undefined, note || undefined);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `review.photo_${decision}`, targetType: "review", targetId: reviewId });
  return { ok: true };
});
