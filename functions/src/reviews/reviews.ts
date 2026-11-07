import { canReview, publicNameOf, reviewInputSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/create-reservation";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : String(v ?? ""));

/**
 * Avis après l'expérience. Un avis par réservation (identifiant = réservation), réservé aux personnes
 * présentes (ou confirmées une fois l'expérience terminée), dans les 60 jours. L'avis est rattaché à
 * l'EXPÉRIENCE : il reste sur sa fiche, même sans date à venir. La note moyenne est mise à jour dans
 * la même transaction (somme et nombre exacts, pas d'arrondi cumulé).
 */
export const submitReview = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = reviewInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, rating, comment } = parsed.data;
  const user = (await db.doc(`users/${uid}`).get()).data() ?? {};

  return db.runTransaction(async (tx) => {
    const resRef = db.doc(`reservations/${reservationId}`);
    const reviewRef = db.doc(`reviews/${reservationId}`);
    const [res, existing] = await Promise.all([tx.get(resRef), tx.get(reviewRef)]);
    const r = res.data();
    if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (existing.exists) refuse("already_reviewed", "Vous avez déjà donné votre avis.");
    if (!canReview({ status: r.status, sessionSnapshot: { endAt: iso(r.sessionSnapshot?.endAt) } })) refuse("not_reviewable", "Avis impossible pour cette réservation.");
    const expRef = db.doc(`experiences/${r.experienceId}`);
    const e = (await tx.get(expRef)).data() ?? {};

    tx.set(reviewRef, {
      userId: uid,
      reservationId,
      sessionId: r.sessionId,
      experienceId: r.experienceId,
      rating,
      comment,
      publicName: publicNameOf(user.firstName, user.lastName),
      status: "published",
      sessionStartAt: r.sessionSnapshot?.startAt ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(resRef, { reviewId: reservationId, updatedAt: FieldValue.serverTimestamp() });
    const count = ((e.ratingCount as number) ?? 0) + 1;
    const sum = ((e.ratingSum as number) ?? ((e.ratingAvg as number) ?? 0) * ((e.ratingCount as number) ?? 0)) + rating;
    tx.update(expRef, { ratingCount: count, ratingSum: sum, ratingAvg: Math.round((sum / count) * 100) / 100 });
    return { ok: true, reviewId: reservationId };
  });
});

/** Modération : masquer (ou republier) un avis. La note moyenne de l'expérience est recalculée. Journalisé. */
export const adminSetReviewStatus = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ reviewId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), status: z.enum(["published", "hidden"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reviewId, status } = parsed.data;
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`reviews/${reviewId}`);
    const rv = (await tx.get(ref)).data();
    if (!rv) throw new HttpsError("not-found", "Avis introuvable.", { reason: "not_found" });
    if (rv.status === status) return;
    const expRef = db.doc(`experiences/${rv.experienceId}`);
    const e = (await tx.get(expRef)).data() ?? {};
    const sign = status === "hidden" ? -1 : 1;
    const count = Math.max(0, ((e.ratingCount as number) ?? 0) + sign);
    const sum = Math.max(0, ((e.ratingSum as number) ?? 0) + sign * (rv.rating as number));
    tx.update(ref, { status, moderatedBy: actor.uid, moderatedAt: FieldValue.serverTimestamp() });
    tx.update(expRef, { ratingCount: count, ratingSum: sum, ratingAvg: count ? Math.round((sum / count) * 100) / 100 : 0 });
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `review.${status === "hidden" ? "hide" : "publish"}`, targetType: "review", targetId: reviewId });
  return { ok: true };
});

/**
 * Le lendemain de l'expérience (entre 2 h et 26 h après la fin) : notification « Donnez votre avis »
 * aux participants qui ne l'ont pas encore fait. Une seule fois par réservation.
 */
export async function sendReviewRequests(now = Date.now()) {
  const snap = await db
    .collection("reservations")
    .where("status", "in", ["confirmed", "attended"])
    .where("sessionSnapshot.endAt", ">=", Timestamp.fromMillis(now - 26 * 3_600_000))
    .where("sessionSnapshot.endAt", "<=", Timestamp.fromMillis(now - 2 * 3_600_000))
    .limit(500)
    .get();
  let n = 0;
  for (const d of snap.docs) {
    const r = d.data();
    if (r.reviewId || r.reviewRequestedAt) continue;
    const batch = db.batch();
    batch.update(d.ref, { reviewRequestedAt: FieldValue.serverTimestamp() });
    batch.set(db.collection(`users/${r.userId}/notifications`).doc(), {
      type: "review_request",
      title: { fr: "Comment s'est passée votre expérience ?", ar: "كيف كانت تجربتك؟" },
      body: { fr: "Donnez votre avis en 30 secondes : il aide les prochains participants.", ar: "شارك رأيك في 30 ثانية: يساعد المشاركين القادمين." },
      link: `/espace/reservations/${d.id}#avis`,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    n++;
  }
  return n;
}

export const reviewRequests = onSchedule({ schedule: "every 60 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  const n = await sendReviewRequests();
  if (n) logger.info(`${n} demande(s) d'avis envoyée(s).`);
});
