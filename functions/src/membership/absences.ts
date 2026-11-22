import { ABSENCES_BEFORE_SUSPENSION, countedAbsences, needsTicket, SELF_CHECKIN_AFTER_MIN, SUSPENSION_DAYS } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { dateFr } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { absenceMail } from "../mail/templates";
import { refuse } from "../reservations/refuse";

const toMs = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : v ? new Date(String(v)).getTime() : 0);

/**
 * Absence sur une réservation couverte par le pass (décision 8) : 1re → avertissement, 2e (sur 90 jours, depuis la
 * dernière suspension) → pass suspendu 14 jours. Notification et e-mail. Renvoie l'état après coup.
 */
export async function recordAbsence(uid: string, reservationId: string, title: string, now = Date.now()): Promise<"warning" | "suspended" | "none"> {
  const ref = db.doc(`memberships/${uid}`);
  const outcome = await db.runTransaction(async (tx) => {
    const m = (await tx.get(ref)).data();
    if (!m) return { kind: "none" as const };
    const absences = ((m.absences ?? []) as { at: Timestamp; reservationId: string }[]).filter((a) => a.reservationId !== reservationId);
    absences.push({ at: Timestamp.fromMillis(now), reservationId });
    const since = Math.max(toMs(m.lastSuspensionAt), toMs(m.lastSuspensionLiftedAt));
    const count = countedAbsences(absences.map((a) => ({ at: a.at.toDate() })), new Date(now), since ? new Date(since) : null);
    const suspend = count >= ABSENCES_BEFORE_SUSPENSION;
    const until = new Date(now + SUSPENSION_DAYS * 86_400_000);
    tx.update(ref, { absences, ...(suspend ? { suspendedUntil: Timestamp.fromDate(until), lastSuspensionAt: Timestamp.fromMillis(now) } : {}), updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection(`users/${uid}/notifications`).doc(), suspend
      ? { type: "membership_suspended", title: { fr: "Pass suspendu 2 semaines", ar: "تعليق الباس أسبوعين", en: "Pass suspended for 2 weeks" }, body: { fr: `Deuxième absence sans check-in. Vos places ne sont plus incluses jusqu'au ${dateFr(until)}.`, ar: "غياب ثانٍ دون تسجيل الوصول.", en: "Second no-show without check-in." }, link: "/abonnement", createdAt: FieldValue.serverTimestamp() }
      : { type: "absence_warning", title: { fr: "Absence notée", ar: "تم تسجيل غياب", en: "No-show noted" }, body: { fr: "Pas de check-in : c'est un avertissement. À la prochaine absence, votre pass sera suspendu 2 semaines.", ar: "لا تسجيل وصول: هذا تنبيه.", en: "No check-in: this is a warning." }, link: `/espace/reservations/${reservationId}`, createdAt: FieldValue.serverTimestamp() });
    return { kind: suspend ? ("suspended" as const) : ("warning" as const), until };
  });
  if (outcome.kind === "none") return "none";
  const u = (await db.doc(`users/${uid}`).get()).data();
  if (u?.email) {
    const locale = String(u.locale ?? "fr");
    await sendMail({ to: u.email, locale, ...absenceMail({ locale, firstName: String(u.firstName ?? ""), title, suspendedUntil: outcome.kind === "suspended" ? dateFr(outcome.until!) : null }), kind: outcome.kind === "suspended" ? "pass_suspended" : "absence_warning", refs: { reservationId } }).catch(() => undefined);
  }
  return outcome.kind;
}

/**
 * Pas de check-in = absence (décision 8), 1 h après le début, pour les événements au check-in (sans billet : avec
 * une hôtesse ou un organisateur, c'est le pointage qui fait foi). Une seule fois par date.
 */
export async function markAbsences(sessionId: string, s: DocumentData, e: DocumentData, now = Date.now()): Promise<number> {
  const start = (s.startAt as Timestamp).toMillis();
  if (now < start + SELF_CHECKIN_AFTER_MIN * 60_000 || s.absencesAt) return 0;
  await db.doc(`sessions/${sessionId}`).update({ absencesAt: FieldValue.serverTimestamp() });
  const res = await db.collection("reservations").where("sessionId", "==", sessionId).where("status", "==", "confirmed").get();
  let n = 0;
  for (const r of res.docs) {
    const d = r.data();
    if (d.arrivedAt || d.checkedInAt || needsTicket(e, d)) continue;
    await r.ref.update({ status: "no_show", absence: { at: Timestamp.fromMillis(now), auto: true }, updatedAt: FieldValue.serverTimestamp() });
    if (Number(d.pricing?.coverage?.passSeats ?? 0) > 0) await recordAbsence(d.userId, r.id, String(d.sessionSnapshot?.title?.fr ?? ""), now);
    n++;
  }
  return n;
}

/** Équipe : la personne était bien là (check-in oublié) — l'absence est annulée, la suspension levée si elle en venait. Journalisé. */
export const adminCancelAbsence = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = z.object({ reservationId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const resRef = db.doc(`reservations/${v.data.reservationId}`);
  const r = (await resRef.get()).data();
  if (!r) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  if (r.status !== "no_show") refuse("not_absent", "Cette réservation n'est pas une absence.");
  await resRef.update({ status: "attended", absence: FieldValue.delete(), absenceCancelledBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
  const memRef = db.doc(`memberships/${r.userId}`);
  await db.runTransaction(async (tx) => {
    const m = (await tx.get(memRef)).data();
    if (!m) return;
    const absences = ((m.absences ?? []) as { reservationId: string; at: Timestamp }[]).filter((a) => a.reservationId !== resRef.id);
    // Une suspension vient de 2 absences : en retirer une la lève.
    const suspended = toMs(m.suspendedUntil) > Date.now();
    tx.update(memRef, { absences, ...(suspended ? { suspendedUntil: null, lastSuspensionLiftedAt: FieldValue.serverTimestamp() } : {}), updatedAt: FieldValue.serverTimestamp() });
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "reservation.absence.cancel", targetType: "reservation", targetId: resRef.id });
  return { ok: true };
});
