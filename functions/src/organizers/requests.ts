import { localDayAt, organizerCancelRequestSchema, organizerRequestDecisionSchema, saturdayProposalSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { sendMail } from "../mail/mailer";
import { teamAlertMail } from "../mail/templates";
import { refuse } from "../reservations/refuse";
import { requireOrganizer } from "./access";
import { notifyOrganizer } from "./organizers";

/**
 * Lot O (docs/26) — les demandes d'un organisateur à l'équipe (collection `organizerRequests`, écrite par le serveur) :
 * - « cancel_session » : il ne peut plus annuler une date lui-même ; il le demande, l'équipe annule et rembourse (ou non) ;
 * - « saturday » : il propose une activité validée pour l'activité du samedi ; l'équipe la place sur un samedi (ou non).
 */

const dateFr = (d: Date) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" }).format(d);

/** Prévient l'équipe par e-mail (admins et super-admins). */
async function mailTeam(subject: string, paragraphs: string[], path: string) {
  const team = await db.collection("users").where("role", "in", ["admin", "superadmin"]).limit(20).get();
  const mail = teamAlertMail({ subject, paragraphs, path });
  await Promise.all(
    team.docs
      .map((u) => u.get("email") as string | undefined)
      .filter((e): e is string => Boolean(e))
      .map((to) => sendMail({ to, locale: "fr", ...mail, kind: "team_alert", refs: {} }).catch((e) => logger.error("Alerte équipe non envoyée", { error: String(e) }))),
  );
}

/** Organisateur : demander l'annulation d'une date de SON activité (motif obligatoire). */
export const organizerRequestCancellation = onCall({ region: REGION }, async (req) => {
  const o = await requireOrganizer(req, { approvedOnly: true });
  const v = organizerCancelRequestSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const s = (await db.doc(`sessions/${v.data.sessionId}`).get()).data();
  if (!s || s.organizerId !== o.orgId) throw new HttpsError("permission-denied", "Cette date ne vous appartient pas.", { reason: "not_owner" });
  if (s.status === "cancelled") refuse("already_cancelled", "Cette date est déjà annulée.");
  if ((s.startAt as Timestamp).toMillis() < Date.now()) refuse("past", "Cette date est passée.");
  const open = await db.collection("organizerRequests").where("sessionId", "==", v.data.sessionId).where("status", "==", "pending").limit(1).get();
  if (!open.empty) refuse("already_requested", "Une demande d'annulation est déjà en cours pour cette date.");
  const title = String(s.experienceSnapshot?.title?.fr ?? "");
  const ref = db.collection("organizerRequests").doc();
  await ref.set({
    type: "cancel_session", status: "pending", organizerId: o.orgId, organizerName: String(o.org.name ?? ""), experienceId: s.experienceId, sessionId: v.data.sessionId,
    title, startAt: s.startAt, participants: Number(s.seatsConfirmed ?? 0), reason: v.data.reason, createdAt: FieldValue.serverTimestamp(), createdBy: o.uid,
  });
  await mailTeam(`Demande d'annulation : ${title}`, [`${String(o.org.name ?? "Un organisateur")} demande l'annulation de la date du ${dateFr((s.startAt as Timestamp).toDate())} (${Number(s.seatsConfirmed ?? 0)} inscrit(s)).`, `Motif : ${v.data.reason}`, "Annulez la date (remboursement intégral des inscrits) ou refusez avec un message."], "/admin/organisateurs");
  await audit({ actorUid: o.uid, actorRole: "organizer", action: "organizer.request.cancel_session", targetType: "session", targetId: v.data.sessionId, after: { requestId: ref.id } });
  return { ok: true, requestId: ref.id };
});

/** Organisateur : proposer une activité validée (Activités ou Événements) pour l'activité du samedi. */
export const organizerProposeSaturday = onCall({ region: REGION }, async (req) => {
  const o = await requireOrganizer(req, { approvedOnly: true });
  const v = saturdayProposalSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const e = (await db.doc(`experiences/${v.data.experienceId}`).get()).data();
  if (!e || e.organizerId !== o.orgId) throw new HttpsError("permission-denied", "Cette activité ne vous appartient pas.", { reason: "not_owner" });
  if (e.status !== "published") refuse("not_published", "Seule une activité validée et en ligne peut être proposée.");
  // 24/11 : seul l'univers Activités passe le samedi (les Événements ont leurs propres dates).
  if (String(e.categoryId) !== "move") refuse("not_activity", "Seule une activité (univers Activités) peut être proposée pour un samedi.");
  if (v.data.dates.some((d) => new Date(`${d}T12:00:00Z`).getUTCDay() !== 6 || localDayAt(d, "23:59").getTime() < Date.now())) invalidArgument([{ path: ["dates"], message: "saturday" }]);
  const open = await db.collection("organizerRequests").where("experienceId", "==", v.data.experienceId).where("status", "==", "pending").get();
  if (open.docs.some((d) => d.get("type") === "saturday")) refuse("already_requested", "Cette activité est déjà proposée : l'équipe vous répondra.");
  const title = String(e.title?.fr ?? "");
  const ref = db.collection("organizerRequests").doc();
  await ref.set({
    type: "saturday", status: "pending", organizerId: o.orgId, organizerName: String(o.org.name ?? ""), experienceId: v.data.experienceId, cityId: e.cityId,
    title, dates: v.data.dates, note: v.data.note ?? "", createdAt: FieldValue.serverTimestamp(), createdBy: o.uid,
  });
  await mailTeam(`Proposition pour un samedi : ${title}`, [`${String(o.org.name ?? "Un organisateur")} propose « ${title} » pour l'activité du samedi.`, v.data.dates.length ? `Samedis souhaités : ${v.data.dates.join(", ")}.` : "Pas de samedi précis.", v.data.note ? `Message : ${v.data.note}` : ""].filter(Boolean), "/admin/rendez-vous");
  await audit({ actorUid: o.uid, actorRole: "organizer", action: "organizer.request.saturday", targetType: "experience", targetId: v.data.experienceId, after: { requestId: ref.id, dates: v.data.dates.join(" ") } });
  return { ok: true, requestId: ref.id };
});

/** Équipe : accepter ou refuser une demande d'organisateur. L'organisateur est prévenu (notification + e-mail). */
export const adminDecideOrganizerRequest = onCall({ region: REGION, timeoutSeconds: 300 }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const v = organizerRequestDecisionSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const { requestId, decision, message, date, time, capacity } = v.data;
  const ref = db.doc(`organizerRequests/${requestId}`);
  const r = (await ref.get()).data();
  if (!r) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });
  if (r.status !== "pending") refuse("not_pending", "Cette demande a déjà été traitée.");
  const who = { uid: actor.uid, role: roleOf(req) };
  const title = String(r.title ?? "");
  let placedOn: string | null = null;
  if (decision === "accept" && r.type === "cancel_session") {
    const { cancelSessionCore } = await import("../admin/reservations-admin");
    await cancelSessionCore(String(r.sessionId), who, `Annulée à la demande de l'organisateur : ${String(r.reason ?? "")}`.slice(0, 500));
  }
  if (decision === "accept" && r.type === "saturday") {
    if (!date) invalidArgument([{ path: ["date"], message: "required" }]);
    const rotation = (await db.collection("rendezvous").where("cityId", "==", r.cityId).where("kind", "==", "rotation").limit(1).get()).docs[0];
    if (!rotation) refuse("no_rotation", "Aucune activité du samedi dans cette ville.");
    const { setRotationWeekCore } = await import("../rendezvous/rotation");
    await setRotationWeekCore({ id: rotation!.id, date, override: { experienceId: r.experienceId, ...(time ? { time } : {}), ...(capacity ? { capacity } : {}), shift: false, note: `Proposé par ${String(r.organizerName ?? "l'organisateur")}` } }, who);
    placedOn = date!;
  }
  await ref.update({ status: decision === "accept" ? "accepted" : "refused", decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid, message: message || null, ...(placedOn ? { placedOn } : {}) });
  const satLabel = placedOn ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${placedOn}T12:00:00Z`)) : "";
  const texts = r.type === "cancel_session"
    ? decision === "accept"
      ? { heading: `Date annulée : « ${title} »`, paragraphs: ["L'équipe a annulé la date comme demandé. Les inscrits sont remboursés intégralement et prévenus."] }
      : { heading: `Annulation refusée : « ${title} »`, paragraphs: [`Message de l'équipe : ${message}`, "La date est maintenue."] }
    : decision === "accept"
      ? { heading: `« ${title} » sera l'activité du ${satLabel}`, paragraphs: ["L'équipe a retenu votre proposition pour l'activité du samedi. La date est créée et ouvrira à la réservation la semaine venue."] }
      : { heading: `Proposition pour un samedi : « ${title} »`, paragraphs: [`Message de l'équipe : ${message}`] };
  await notifyOrganizer(String(r.organizerId), { type: `organizer_request_${r.type}_${decision}`, ...texts, path: r.type === "cancel_session" ? `/pro/dates/${r.sessionId}` : `/pro/activites/${r.experienceId}` });
  await audit({ actorUid: actor.uid, actorRole: who.role, action: `organizer.request.${r.type}.${decision}`, targetType: "organizerRequest", targetId: requestId, after: { message: message || null, placedOn } });
  return { ok: true };
});
