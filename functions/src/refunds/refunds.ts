import { canRequestRefund, refundDecisionSchema, refundRequestSchema } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { recordRefundEntry } from "../commissions/ledger";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireAuth, requireRole, roleOf } from "../lib/guards";
import { noticeMail } from "../mail/templates";
import { sendMail } from "../mail/mailer";
import { issueRefund, refundedSoFar } from "../payments/refund";
import { refuse } from "../reservations/refuse";

/**
 * Étape 22 — demandes de remboursement. Le participant explique ce qui s'est passé (jusqu'à 7 jours après
 * l'activité) ; l'équipe décide : remboursement total, partiel (jamais plus que ce qui a été payé en ligne et pas
 * encore remboursé) ou refus motivé. Une seule demande par réservation. Idempotent : une décision n'est appliquée
 * qu'une fois (transaction sur la demande).
 */
const dh = (c: number) => `${(c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH`;

export const requestRefund = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const parsed = refundRequestSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { reservationId, reason, message } = parsed.data;
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r || r.userId !== uid) throw new HttpsError("not-found", "Réservation introuvable.", { reason: "not_found" });
  const paid = Number(r.pricing?.total ?? 0);
  const startAt = (r.sessionSnapshot?.startAt as Timestamp | undefined)?.toDate().toISOString() ?? "";
  if (!r.paymentId || !canRequestRefund({ status: r.status, sessionStartAt: startAt, paidAmount: paid, refundedAmount: r.refundedAmount ?? 0 }, new Date())) {
    refuse("not_refundable", "Cette réservation ne peut plus faire l'objet d'une demande.");
  }
  const ref = db.doc(`refundRequests/${reservationId}`);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) refuse("already_requested", "Une demande existe déjà pour cette réservation.");
    tx.set(ref, {
      reservationId,
      userId: uid,
      organizerId: r.organizerId ?? null,
      experienceId: r.experienceId,
      title: r.sessionSnapshot?.title ?? null,
      sessionStartAt: r.sessionSnapshot?.startAt ?? null,
      reason,
      message,
      paidAmount: paid,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  // L'organisateur concerné est informé (l'équipe l'écoute avant de décider : conditions de vente, art. 4).
  if (r.organizerId) {
    const det = (await db.doc(`organizers/${r.organizerId}/private/details`).get()).data() ?? {};
    for (const m of (det.memberUids as string[] | undefined) ?? []) {
      await db.collection(`users/${m}/notifications`).add({ type: "refund_request", title: { fr: "Réclamation d'un participant", ar: "Réclamation d'un participant", en: "Participant claim" }, body: { fr: `Un participant de « ${r.sessionSnapshot?.title?.fr ?? ""} » demande un remboursement. L'équipe vous contactera si besoin.`, ar: "", en: "" }, link: "/pro/reservations", createdAt: FieldValue.serverTimestamp() });
    }
  }
  await audit({ actorUid: uid, actorRole: roleOf(req), action: "refund.request", targetType: "reservation", targetId: reservationId, after: { reason } });
  return { ok: true };
});

export const adminDecideRefund = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = refundDecisionSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { requestId, decision, amountDh, message } = parsed.data;
  const ref = db.doc(`refundRequests/${requestId}`);
  // Verrou : la demande passe « en cours » une seule fois (deux clics = une seule décision).
  const q = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    if (!d) throw new HttpsError("not-found", "Demande introuvable.", { reason: "not_found" });
    if (d.status !== "pending") refuse("already_decided", "Cette demande a déjà été traitée.");
    tx.update(ref, { status: "processing", updatedAt: FieldValue.serverTimestamp() });
    return d;
  });
  const resRef = db.doc(`reservations/${q.reservationId}`);
  const r = (await resRef.get()).data()!;
  try {
    if (decision === "decline") {
      await ref.update({ status: "declined", message: message || null, decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid });
    } else {
      const remaining = Number(r.pricing?.total ?? 0) - (await refundedSoFar(String(r.paymentId)));
      const amount = decision === "full" ? remaining : Math.min(remaining, Math.round((amountDh ?? 0) * 100));
      if (amount <= 0) refuse("nothing_to_refund", "Il ne reste rien à rembourser sur cette réservation.");
      const result = await issueRefund(String(r.paymentId), amount, `refund_request_${q.reason}`);
      const refunded = Number(r.refundedAmount ?? 0) + amount;
      await resRef.update({ refundedAmount: refunded, ...(refunded >= Number(r.pricing?.total ?? 0) && result.status === "succeeded" ? { status: "refunded" } : {}), updatedAt: FieldValue.serverTimestamp() });
      await recordRefundEntry(q.reservationId, amount);
      await ref.update({ status: refunded >= Number(r.pricing?.total ?? 0) ? "refunded" : "partially_refunded", amount, message: message || null, refundStatus: result.status, decidedAt: FieldValue.serverTimestamp(), decidedBy: actor.uid });
    }
  } catch (e) {
    // Échec (prestataire, montant) : la demande redevient « en attente » pour pouvoir être reprise.
    await ref.update({ status: "pending" });
    throw e;
  }
  const after = (await ref.get()).data()!;
  const title = r.sessionSnapshot?.title?.fr ?? "";
  const body =
    decision === "decline"
      ? { fr: `Votre demande de remboursement pour « ${title} » n'a pas été retenue. ${message ?? ""}`.trim(), ar: `لم يتم قبول طلب الاسترداد الخاص بـ« ${title} ».`, en: `Your refund request for “${title}” was not accepted. ${message ?? ""}`.trim() }
      : { fr: `${dh(after.amount)} vous sont remboursés pour « ${title} ».`, ar: `سيتم استرداد ${dh(after.amount)} عن « ${title} ».`, en: `${dh(after.amount)} is being refunded for “${title}”.` };
  await db.collection(`users/${r.userId}/notifications`).add({ type: decision === "decline" ? "refund_declined" : "refund_accepted", title: { fr: "Votre demande de remboursement", ar: "طلب الاسترداد", en: "Your refund request" }, body, link: `/espace/reservations/${q.reservationId}`, createdAt: FieldValue.serverTimestamp() });
  const u = await auth.getUser(r.userId).catch(() => null);
  if (u?.email) await sendMail({ to: u.email, locale: "fr", ...noticeMail({ heading: "Votre demande de remboursement", paragraphs: [body.fr], ctaLabel: "Voir ma réservation", path: `/espace/reservations/${q.reservationId}` }), kind: `refund_request_${after.status}`, refs: { reservationId: q.reservationId } }).catch(() => undefined);
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `refund.${decision}`, targetType: "reservation", targetId: q.reservationId, after: { amount: after.amount ?? 0, status: after.status } });
  return { ok: true, status: after.status, amount: after.amount ?? 0 };
});
