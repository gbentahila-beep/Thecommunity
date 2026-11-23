import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall, type CallableRequest } from "firebase-functions/v2/https";
import { z } from "zod";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { notifyReservationChange } from "../notify/reminders";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { requireOrganizer, requireTeamOrOrganizerOf } from "../organizers/access";
import { cancelReservationCore, idSchema } from "../reservations/cancel-reservation";
import { refuse } from "../reservations/create-reservation";
import { moveReservationCore } from "../tables/move";
import { cancelRequests } from "../tables/allocation";
import { recordAbsence } from "../membership/absences";
import { notifyCancelledByTeam } from "../notify/cancellations";

const reasonSchema = z.string().trim().min(2, "required").max(200, "tooLong");

const requireTeam = (req: CallableRequest<unknown>) => requireRole(req, ["admin", "superadmin"]);

async function notify(uid: string, type: string, title: { fr: string; ar: string }, body: { fr: string; ar: string }, link: string) {
  await db.collection(`users/${uid}/notifications`).add({ type, title, body, link, createdAt: FieldValue.serverTimestamp() });
}
const dh = (centimes: number) => `${(centimes / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;

/**
 * Annulation d'une réservation par l'équipe. Remboursement au choix : intégral (par défaut, décision D6),
 * selon la politique de l'expérience, ou aucun (ex. comportement contraire à la charte). Motif obligatoire,
 * journalisé ; la personne est prévenue.
 */
export const adminCancelReservation = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, refund: z.enum(["full", "policy", "none"]).default("full"), reason: reasonSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, refund, reason } = parsed.data;
  const res = await cancelReservationCore({ reservationId, by: "admin", actorUid: actor.uid, refundMode: refund, reason, allowStarted: true });
  // Audit 23/11 : notification ET e-mail.
  await notifyCancelledByTeam(reservationId, res.refundAmount);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "reservation.cancel", targetType: "reservation", targetId: reservationId, after: { refund, refundAmount: res.refundAmount, reason } });
  return { ok: true, refundAmount: res.refundAmount, refundStatus: res.refundStatus };
});

/**
 * Annulation d'une date entière (météo, partenaire fermé…) : la date est fermée, chaque réservation
 * est annulée et remboursée intégralement, la liste d'attente et les demandes en cours sont closes,
 * tout le monde est prévenu. Journalisé.
 */
export const adminCancelSession = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  requireAuth(req);
  const parsed = z.object({ sessionId: idSchema, reason: reasonSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { sessionId, reason } = parsed.data;
  const sessRef = db.doc(`sessions/${sessionId}`);
  // Étape 20 : l'organisateur annule les dates de SES activités (même remboursement intégral).
  const actor = await requireTeamOrOrganizerOf(req, (await sessRef.get()).get("organizerId"));
  return { ok: true, ...(await cancelSessionCore(sessionId, { uid: actor.uid, role: actor.role }, reason)) };
});

/** Cœur de l'annulation d'une date (aussi utilisé par la vitrine, étape M) : remboursement intégral, tout le monde prévenu. */
export async function cancelSessionCore(sessionId: string, actor: { uid: string; role: string }, reason: string) {
  const sessRef = db.doc(`sessions/${sessionId}`);
  await db.runTransaction(async (tx) => {
    const s = (await tx.get(sessRef)).data();
    if (!s) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
    if (s.status === "cancelled") refuse("already_cancelled", "Cette date est déjà annulée.");
    // Plus aucune réservation ni offre possible à partir d'ici.
    tx.update(sessRef, { status: "cancelled", cancellation: { at: FieldValue.serverTimestamp(), by: actor.uid, reason }, updatedAt: FieldValue.serverTimestamp() });
  });

  const active = await db.collection("reservations").where("sessionId", "==", sessionId).where("status", "in", ["confirmed", "pending_payment"]).get();
  let refunded = 0;
  const failures: string[] = [];
  for (const d of active.docs) {
    try {
      const res = await cancelReservationCore({ reservationId: d.id, by: "admin", actorUid: actor.uid, refundMode: "full", reason: "session_cancelled", allowStarted: true });
      refunded += res.refundAmount;
      await notifyCancelledByTeam(d.id, res.refundAmount, { sessionReason: reason }).catch(() => undefined);
    } catch {
      failures.push(d.id);
    }
  }
  const [waiting, requests] = await Promise.all([
    sessRef.collection("waitlist").where("status", "==", "waiting").get(),
    db.collection("bookingRequests").where("sessionId", "==", sessionId).where("status", "==", "pending").get(),
  ]);
  const batch = db.batch();
  for (const w of waiting.docs) batch.update(w.ref, { status: "left", updatedAt: FieldValue.serverTimestamp() });
  for (const q of requests.docs) batch.update(q.ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  batch.update(sessRef, { waitlistCount: 0 });
  await batch.commit();
  for (const w of waiting.docs) {
    await notify(w.id, "event_cancelled", { fr: "Expérience annulée", ar: "تم إلغاء التجربة" }, { fr: "La date pour laquelle vous étiez sur liste d'attente est annulée.", ar: "تم إلغاء الموعد الذي كنت على قائمة انتظاره." }, "/experiences");
  }
  await audit({ actorUid: actor.uid, actorRole: actor.role, action: "session.cancel", targetType: "session", targetId: sessionId, after: { reason, reservations: active.size, refunded, failures } });
  await cancelRequests(sessionId).catch(() => undefined);
  return { cancelled: active.size - failures.length, refunded, failures };
}

/**
 * Déplace une réservation vers une autre date de la MÊME expérience, dans une transaction sur les deux dates :
 * places vérifiées sur la nouvelle date, libérées (et proposées à la liste d'attente) sur l'ancienne.
 * Le montant payé est conservé tel quel. Journalisé ; la personne est prévenue.
 */
export const adminMoveReservation = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, targetSessionId: idSchema }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, targetSessionId } = parsed.data;
  const moved = await moveReservationCore({ reservationId, targetSessionId, actorUid: actor.uid, by: "admin" });

  const when = moved.startAt.toLocaleString("fr-FR", { timeZone: "Africa/Casablanca", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const whenAr = moved.startAt.toLocaleString("ar-MA", { timeZone: "Africa/Casablanca", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  await notify(moved.userId, "event_updated", { fr: "Votre réservation a changé de date", ar: "تغيّر موعد حجزك" }, { fr: `Nouvelle date : ${when}.`, ar: `الموعد الجديد: ${whenAr}.` }, `/espace/reservations/${reservationId}`);
  await notifyReservationChange(reservationId, "date").catch(() => undefined);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "reservation.move", targetType: "reservation", targetId: reservationId, before: { sessionId: moved.from }, after: { sessionId: targetSessionId } });
  return { ok: true };
});

/**
 * Pointage le jour J : présent (« attended »), absent (« no_show ») ou retour à « confirmée ».
 * Possible à partir de 3 h avant le début. Les absences nourrissent l'historique vu par l'équipe.
 */
export const adminCheckIn = onCall({ region: REGION }, async (req) => {
  requireAuth(req);
  const parsed = z.object({ reservationId: idSchema, presence: z.enum(["attended", "no_show", "confirmed"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, presence } = parsed.data;
  const resRef = db.doc(`reservations/${reservationId}`);
  // Étape 20 : l'organisateur pointe les participants de SES activités.
  const actor = await requireTeamOrOrganizerOf(req, (await resRef.get()).get("organizerId"));
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(resRef)).data();
    if (!r) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (!["confirmed", "attended", "no_show"].includes(r.status)) refuse("not_checkable", "Seule une réservation confirmée se pointe.");
    if ((r.sessionSnapshot.startAt as Timestamp).toMillis() - Date.now() > 3 * 3_600_000) refuse("too_early", "Le pointage ouvre 3 h avant le début.");
    if (presence === "attended" && r.groupId) tx.set(db.doc(`groups/${r.groupId}`), { arrivedUids: FieldValue.arrayUnion(r.userId) }, { merge: true });
    tx.update(resRef, {
      status: presence,
      checkedInAt: presence === "confirmed" ? null : FieldValue.serverTimestamp(),
      checkedInBy: presence === "confirmed" ? null : actor.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  // docs/22 § 17.I : absence pointée par l'équipe ou l'organisateur sur une place incluse dans le pass.
  if (presence === "no_show") {
    const r = (await resRef.get()).data();
    if (r && Number(r.pricing?.coverage?.passSeats ?? 0) > 0) await recordAbsence(r.userId, reservationId, String(r.sessionSnapshot?.title?.fr ?? ""));
  }
  await audit({ actorUid: actor.uid, actorRole: actor.role, action: `reservation.checkin.${presence}`, targetType: "reservation", targetId: reservationId });
  return { ok: true };
});

/**
 * Étape 11 : part partenaire réglée (ou non) sur place. Information de suivi uniquement : Wenzy
 * n'encaisse jamais cette part. Sans objet pour une expérience « tout en ligne ».
 */
export const adminSetPartnerPayment = onCall({ region: REGION }, async (req) => {
  const actor = requireTeam(req);
  const parsed = z.object({ reservationId: idSchema, paid: z.boolean() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, paid } = parsed.data;
  const resRef = db.doc(`reservations/${reservationId}`);
  await db.runTransaction(async (tx) => {
    const r = (await tx.get(resRef)).data();
    if (!r) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
    if (!r.partnerPaymentStatus || r.partnerPaymentStatus === "not_applicable") refuse("not_applicable", "Aucune part à régler sur place pour cette réservation.");
    if (!["confirmed", "attended"].includes(r.status)) refuse("not_checkable", "Seule une réservation confirmée peut être marquée.");
    tx.update(resRef, {
      partnerPaymentStatus: paid ? "paid_on_site" : "due_on_site",
      partnerPaidAt: paid ? FieldValue.serverTimestamp() : null,
      partnerPaidMarkedBy: paid ? actor.uid : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: paid ? "reservation.partner.paid" : "reservation.partner.unpaid", targetType: "reservation", targetId: reservationId });
  return { ok: true };
});

/** Journalise un export de données personnelles (liste de participants, réservations) avant son téléchargement. */
export const adminLogExport = onCall({ region: REGION }, async (req) => {
  requireAuth(req);
  const team = ["admin", "superadmin"].includes(roleOf(req));
  // Étape 20 : un organisateur validé journalise aussi ses exports (participants et réservations de SES activités,
  // préparés par le serveur de l'espace /pro) ; les autres types d'export restent réservés à l'équipe.
  const org = team ? null : await requireOrganizer(req, { approvedOnly: true });
  const parsed = z.object({ kind: z.enum(["participants", "reservations", "users", "two_part"]), targetId: z.string().max(128).default(""), rows: z.number().int().min(0).max(100_000) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  if (org && !["participants", "reservations"].includes(parsed.data.kind)) throw new HttpsError("permission-denied", "Action réservée à l'équipe.");
  const actor = { uid: req.auth!.uid };
  await audit({ actorUid: actor.uid, actorRole: org ? "organizer" : roleOf(req), action: `export.${parsed.data.kind}`, targetType: "export", targetId: parsed.data.targetId || parsed.data.kind, after: { rows: parsed.data.rows, ...(org ? { organizerId: org.orgId } : {}) } });
  return { ok: true };
});
