import { MOROCCO_TIMEZONE, planSessionDates, sessionPlanSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { refuse } from "../reservations/refuse";
import { notifyNewDates } from "./alerts";

const input = z.object({ experienceId: z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9_-]+$/), sessions: sessionPlanSchema });

/**
 * Rendez-vous récurrent (docs/22, décision 24) : ajouter une ou plusieurs dates en quelques secondes (date, heure,
 * répétition, places), sans repasser par le formulaire. Prix, format et lieu habituel viennent du rendez-vous ;
 * les personnes qui l'avaient demandé sont prévenues. Journalisé.
 */
export const adminAddSessions = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = input.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`experiences/${v.data.experienceId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Rendez-vous introuvable.", { reason: "not_found" });
  const e = snap.data()!;
  if (e.status === "archived") refuse("archived", "Réactivez le rendez-vous avant d'ajouter des dates.");
  const planned = planSessionDates(v.data.sessions, Number(e.durationMinutes ?? 120), MOROCCO_TIMEZONE);
  const now = Date.now();
  if (planned.some((d) => new Date(d.startAt).getTime() < now)) invalidArgument([{ path: ["sessions", "firstDate"], message: "inPast" }]);
  const snapshot = {
    title: e.title,
    slug: e.slug,
    coverImagePath: e.images?.[0]?.path ?? "",
    categoryId: e.categoryId,
    bookingMode: e.bookingMode,
    district: e.district ?? "",
    admission: e.admission ?? "direct",
  };
  const batch = db.batch();
  for (const d of planned) {
    batch.set(db.collection("sessions").doc(), {
      experienceId: ref.id,
      organizerId: e.organizerId ?? null,
      experienceSnapshot: snapshot,
      cityId: e.cityId,
      categoryId: e.categoryId,
      startAt: Timestamp.fromDate(new Date(d.startAt)),
      endAt: Timestamp.fromDate(new Date(d.endAt)),
      price: e.price,
      capacity: v.data.sessions.capacity,
      seatsConfirmed: 0,
      seatsHeld: 0,
      waitlistCount: 0,
      status: e.status === "published" ? "published" : "draft",
      isFeatured: false,
      groupsStatus: "none",
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  const first = Math.min(...planned.map((d) => new Date(d.startAt).getTime()));
  const current = (e.nextSessionAt as Timestamp | null | undefined)?.toMillis();
  if (!current || current < now || first < current) batch.update(ref, { nextSessionAt: Timestamp.fromMillis(first) });
  await batch.commit();
  const alerted = e.status === "published" ? await notifyNewDates(ref.id, String(e.title?.fr ?? ""), String(e.slug ?? ""), planned.length) : 0;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "sessions.add", targetType: "experience", targetId: ref.id, after: { count: planned.length, alerted } });
  return { created: planned.length };
});
