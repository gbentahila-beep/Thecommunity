import {
  allocationSettingsSchema, partnerResponseSchema, proposalDeadline, proposalResponseSchema, requestActionSchema, riskDecisionSchema, tableMessageSchema, tablesTimeline, bookingClosesAt,
} from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { dateTimeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { proposalMail } from "../mail/templates";
import { cancelReservationCore } from "../reservations/cancel-reservation";
import { refuse } from "../reservations/refuse";
import { isAllocated, runAllocation, sendRequestMessages, settleRequest } from "./allocation";
import { moveReservationCore } from "./move";

const TEAM = ["admin", "superadmin"] as const;
const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/** Réponse du lieu depuis le lien sécurisé (WhatsApp ou e-mail), sans compte (décision 45). */
export const partnerRespondRequest = onCall({ region: REGION }, async (req) => {
  const v = partnerResponseSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`venueRequests/${v.data.requestId}`);
  const r = (await ref.get()).data();
  if (!r || r.token !== v.data.token) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });
  if (r.status !== "sent") return { status: r.status as string };
  const status = await settleRequest(ref.id, v.data.accept, { kind: "partner", note: v.data.note });
  return { status: status === "unchanged" ? r.status : status };
});

/** Équipe : confirmé par téléphone, refusé, relancer, ou noter un WhatsApp / récapitulatif envoyé à la main. Journalisé. */
export const adminRequestAction = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = requestActionSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`venueRequests/${v.data.requestId}`);
  const r = (await ref.get()).data();
  if (!r) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });
  let status: string = r.status;
  if (v.data.action === "confirm_phone" || v.data.action === "refuse") {
    if (r.status !== "sent") refuse("not_pending", "Cette demande n'attend plus de réponse.");
    status = await settleRequest(ref.id, v.data.action === "confirm_phone", { kind: "team", uid: actor.uid, note: v.data.note || (v.data.action === "confirm_phone" ? "Confirmé par téléphone" : "Refusé (appel)") });
  } else if (v.data.action === "resend") {
    if (r.status !== "sent") refuse("not_pending", "Cette demande n'attend plus de réponse.");
    await sendRequestMessages(ref.id, "reminder");
  } else {
    await ref.update({ [v.data.action === "whatsapp_sent" ? "manualWhatsappAt" : "manualRecapAt"]: FieldValue.serverTimestamp(), history: FieldValue.arrayUnion({ at: Timestamp.now(), event: v.data.action, by: actor.uid }) });
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `venue_request.${v.data.action}`, targetType: "venueRequest", targetId: ref.id, after: { status, note: v.data.note } });
  return { ok: true, status };
});

/** Équipe : lancer (ou relancer) l'attribution automatique d'une date. Journalisé. */
export const adminAllocate = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = z.object({ sessionId: idSchema }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const s = (await db.doc(`sessions/${v.data.sessionId}`).get()).data();
  if (!s) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data();
  if (!isAllocated(e)) refuse("not_allocated", "Cette date a un lieu fixe.");
  if (!s.seatsConfirmed) refuse("no_participants", "Aucun inscrit.");
  const out = await runAllocation(v.data.sessionId, actor.uid);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "session.allocate", targetType: "session", targetId: v.data.sessionId, after: out });
  return { ok: true, ...out };
});

/** Paramètres : délais de réponse des lieux (relance, autre lieu proposé). */
export const adminSaveAllocationSettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = allocationSettingsSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  await db.doc("settings/allocation").set({ ...v.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.allocation", targetType: "settings", targetId: "allocation", after: v.data });
  return { ok: true };
});

const whatsappSettingsSchema = z.object({
  provider: z.enum(["outbox", "meta"]),
  phoneNumberId: z.string().trim().max(40).regex(/^\d*$/, "digits"),
  language: z.string().trim().min(2).max(10).default("fr"),
  templates: z.object({ request: z.string().trim().min(1).max(60), reminder: z.string().trim().min(1).max(60), recap: z.string().trim().min(1).max(60) }),
}).refine((v) => v.provider === "outbox" || v.phoneNumberId.length > 0, { path: ["phoneNumberId"], message: "required" });

/** Paramètres (super-admin) : envoi WhatsApp automatique (le jeton reste un secret Cloud, jamais dans la base). */
export const adminSaveWhatsAppSettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const v = whatsappSettingsSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  await db.doc("settings/whatsapp").set({ ...v.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "settings.whatsapp", targetType: "settings", targetId: "whatsapp", after: v.data });
  return { ok: true };
});

/**
 * Date à risque (décision 46) : maintenir, ou proposer une autre date / un regroupement. Chaque inscrit reçoit la
 * proposition (notification et e-mail) et accepte ou est remboursé ; jamais déplacé sans son accord. Journalisé.
 */
export const adminRiskDecision = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, [...TEAM]);
  const v = riskDecisionSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const sessRef = db.doc(`sessions/${v.data.sessionId}`);
  const s = (await sessRef.get()).data();
  if (!s) throw new HttpsError("not-found", "Date introuvable.", { reason: "not_found" });
  const e = (await db.doc(`experiences/${s.experienceId}`).get()).data() ?? {};
  const start = (s.startAt as Timestamp).toDate();
  if (start.getTime() <= Date.now()) refuse("already_started", "La date est passée.");
  if (v.data.action === "keep") {
    await sessRef.update({ risk: { ...(s.risk ?? {}), status: "kept", decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid } });
    if (isAllocated(e) && !s.allocation && Date.now() >= bookingClosesAt(start, e.bookingMode).getTime() && s.seatsConfirmed > 0) await runAllocation(sessRef.id, actor.uid);
    await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "session.risk.keep", targetType: "session", targetId: sessRef.id });
    return { ok: true };
  }
  if (s.risk?.status === "proposed") refuse("already_proposed", "Une proposition est déjà en cours.");
  const target = (await db.doc(`sessions/${v.data.targetSessionId}`).get()).data();
  if (!target || v.data.targetSessionId === sessRef.id || !["published", "full"].includes(target.status) || (target.startAt as Timestamp).toMillis() <= Date.now()) refuse("bad_target", "Date proposée indisponible.");
  if (target!.experienceId !== s.experienceId) {
    const te = (await db.doc(`experiences/${target!.experienceId}`).get()).data() ?? {};
    const sameFormat = (te.templateId || te.subcategoryId) === (e.templateId || e.subcategoryId) && (te.venueTier ?? null) === (e.venueTier ?? null);
    if (!sameFormat) refuse("not_compatible", "Le regroupement se fait avec un événement du même format et de la même gamme.");
  }
  let deadline = proposalDeadline(start, bookingClosesAt((target!.startAt as Timestamp).toDate(), e.bookingMode));
  if (deadline.getTime() < Date.now() + 30 * 60_000) deadline = tablesTimeline(start).revealAt;
  if (deadline.getTime() < Date.now() + 30 * 60_000) refuse("too_late", "Trop tard pour proposer : maintenez ou annulez la date.");
  const kind = target!.experienceId === s.experienceId ? "date" : "merge";
  const res = await db.collection("reservations").where("sessionId", "==", sessRef.id).where("status", "==", "confirmed").get();
  const batch = db.batch();
  for (const r of res.docs) {
    batch.update(r.ref, { proposal: { kind, targetSessionId: v.data.targetSessionId, deadline: Timestamp.fromDate(deadline), status: "pending", at: FieldValue.serverTimestamp() } });
    batch.set(db.collection(`users/${r.get("userId")}/notifications`).doc(), {
      type: "event_updated",
      title: { fr: "Une autre date vous est proposée", ar: "نقترح عليك موعدًا آخر", en: "Another date is suggested" },
      body: { fr: "Pas assez d'inscrits : acceptez la date proposée ou soyez remboursé·e intégralement.", ar: "عدد المسجلين غير كافٍ: اقبل الموعد المقترح أو استرجع المبلغ كاملًا.", en: "Not enough people: accept the suggested date or get a full refund." },
      link: `/espace/reservations/${r.id}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  batch.update(sessRef, { risk: { ...(s.risk ?? {}), status: "proposed", kind, targetSessionId: v.data.targetSessionId, deadline: Timestamp.fromDate(deadline), decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid } });
  await batch.commit();
  const users = res.docs.length ? await db.getAll(...res.docs.map((d) => db.doc(`users/${d.get("userId")}`))) : [];
  await Promise.all(res.docs.map((r, i) => {
    const u = users[i]?.data();
    if (!u?.email) return null;
    const locale = String(u.locale ?? "fr");
    const title = r.get("sessionSnapshot")?.title?.[locale] ?? r.get("sessionSnapshot")?.title?.fr ?? "";
    return sendMail({ to: u.email, locale, ...proposalMail({ locale, firstName: String(u.firstName ?? ""), title, when: dateTimeFor(start, locale), proposed: dateTimeFor((target!.startAt as Timestamp).toDate(), locale), deadline: dateTimeFor(deadline, locale), reservationId: r.id }), kind: "risk_proposal", refs: { reservationId: r.id, sessionId: sessRef.id } });
  }));
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "session.risk.propose", targetType: "session", targetId: sessRef.id, after: { kind, targetSessionId: v.data.targetSessionId, people: res.size } });
  return { ok: true, notified: res.size };
});

/** Le participant accepte la date proposée (déplacé sans repayer) ou la refuse (remboursement intégral). */
export const respondProposal = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = proposalResponseSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const ref = db.doc(`reservations/${v.data.reservationId}`);
  const r = (await ref.get()).data();
  if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  if (r.proposal?.status !== "pending") refuse("no_proposal", "Aucune proposition en cours.");
  if ((r.proposal.deadline as Timestamp).toMillis() < Date.now()) refuse("expired", "Le délai pour répondre est passé.");
  if (v.data.accept) {
    await moveReservationCore({ reservationId: ref.id, targetSessionId: r.proposal.targetSessionId, actorUid: uid, by: "user", proposal: true });
  } else {
    await ref.update({ "proposal.status": "refused", "proposal.answeredAt": FieldValue.serverTimestamp() });
    await cancelReservationCore({ reservationId: ref.id, by: "admin", actorUid: uid, refundMode: "full", reason: "risk_refused" });
  }
  await audit({ actorUid: uid, actorRole: "user", action: v.data.accept ? "reservation.proposal.accept" : "reservation.proposal.refuse", targetType: "reservation", targetId: ref.id });
  return { ok: true };
});

/**
 * Messages entre les personnes d'une table (décision 39) : celles qui ont fait leur check-in, ouverts dès leur
 * arrivée (30 min avant le début), pendant 14 jours (étape Z). Ni numéro ni réseaux affichés. Les autres reçoivent une notification (au plus une par 3 h).
 */
export const sendTableMessage = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = tableMessageSchema.safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const gRef = db.doc(`groups/${v.data.groupId}`);
  const g = (await gRef.get()).data();
  const arrived = (g?.arrivedUids as string[] | undefined) ?? [];
  if (!g || !arrived.includes(uid)) throw new HttpsError("not-found", "Table introuvable.", { reason: "not_found" });
  const s = (await db.doc(`sessions/${g.sessionId}`).get()).data();
  const t = tablesTimeline((s!.startAt as Timestamp).toDate());
  const now = Date.now();
  if (now < t.chatFrom.getTime()) refuse("too_early", "Les messages s'ouvrent à votre arrivée, 30 minutes avant le début.");
  if (now > t.chatUntil.getTime()) refuse("closed", "Les messages de cette table sont fermés.");
  const me = (g.members as { uid: string; firstName: string }[]).find((m) => m.uid === uid);
  await gRef.collection("messages").add({ uid, firstName: me?.firstName ?? "Membre", text: v.data.text, createdAt: FieldValue.serverTimestamp() });
  const notified = (g.chatNotifiedAt ?? {}) as Record<string, Timestamp>;
  const batch = db.batch();
  for (const other of arrived.filter((u) => u !== uid)) {
    if (notified[other] && now - notified[other]!.toMillis() < 3 * 3_600_000) continue;
    batch.set(db.collection(`users/${other}/notifications`).doc(), { type: "table_message", title: { fr: "Nouveau message de votre table", ar: "رسالة جديدة من مائدتك", en: "New message from your table" }, body: { fr: `${me?.firstName ?? "Quelqu'un"} a écrit à la table.`, ar: `${me?.firstName ?? ""} كتب إلى المائدة.`, en: `${me?.firstName ?? "Someone"} wrote to your table.` }, link: `/espace/rencontres/table/${gRef.id}`, createdAt: FieldValue.serverTimestamp() });
    batch.update(gRef, { [`chatNotifiedAt.${other}`]: Timestamp.fromMillis(now) });
  }
  await batch.commit();
  return { ok: true };
});
