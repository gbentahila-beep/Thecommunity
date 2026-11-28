import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";

/** « Me prévenir des prochaines dates » sur une expérience sans date à venir (ou retirer cette alerte). */
export const setExperienceAlert = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = z.object({ experienceId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/), on: z.boolean() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { experienceId, on } = parsed.data;
  const exp = (await db.doc(`experiences/${experienceId}`).get()).data();
  if (!exp || exp.status !== "published") throw new HttpsError("not-found", "Expérience introuvable.", { reason: "not_found" });
  const ref = db.doc(`experienceAlerts/${experienceId}_${uid}`);
  if (on) await ref.set({ userId: uid, experienceId, createdAt: FieldValue.serverTimestamp() });
  else await ref.delete();
  return { ok: true, on };
});

/**
 * De nouvelles dates viennent d'être publiées : chaque personne qui avait demandé à être prévenue reçoit
 * une notification, puis son alerte est retirée (une alerte = une notification).
 */
export async function notifyNewDates(experienceId: string, title: string, slug: string, count: number) {
  const alerts = await db.collection("experienceAlerts").where("experienceId", "==", experienceId).limit(1000).get();
  for (let i = 0; i < alerts.docs.length; i += 200) {
    const batch = db.batch();
    for (const a of alerts.docs.slice(i, i + 200)) {
      batch.set(db.collection(`users/${a.data().userId}/notifications`).doc(), {
        type: "new_dates",
        title: { fr: `Nouvelles dates : ${title}`, ar: `مواعيد جديدة: ${title}` },
        body: {
          fr: count > 1 ? `${count} nouvelles dates sont ouvertes à la réservation.` : "Une nouvelle date est ouverte à la réservation.",
          ar: count > 1 ? `${count} مواعيد جديدة مفتوحة للحجز.` : "موعد جديد مفتوح للحجز.",
        },
        link: `/experiences/${slug}`,
        createdAt: FieldValue.serverTimestamp(),
      });
      batch.delete(a.ref);
    }
    await batch.commit();
  }
  return alerts.size;
}
