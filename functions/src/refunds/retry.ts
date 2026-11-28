import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";
import { sendMail } from "../mail/mailer";
import { refundPendingMail } from "../mail/member-templates";
import { teamAlertMail } from "../mail/templates";
import { personOf } from "../notify/reminders";
import { issueRefund } from "../payments/refund";

const MAX_ATTEMPTS = 3;
const dh = (c: number) => `${(c / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;

/**
 * Audit du 23/11 — relance automatique des remboursements restés « en attente » après une annulation :
 * - aucun remboursement enregistré (le prestataire a échoué) → nouvel essai, jusqu'à 3 ;
 * - remboursement enregistré et réussi entre-temps → la réservation passe « remboursée » ;
 * - remboursement en cours chez le prestataire ou manuel (virement) → rien à relancer, l'équipe est prévenue après 72 h.
 * Au 3e échec : alerte à l'équipe et e-mail « remboursement en cours » à la personne (une seule fois).
 */
export async function retryPendingRefunds(now = Date.now()) {
  const snap = await db.collection("reservations").where("status", "==", "cancelled").where("cancellation.refundStatus", "==", "pending").limit(200).get();
  const out = { retried: 0, succeeded: 0, settled: 0, escalated: 0 };
  for (const d of snap.docs) {
    const r = d.data();
    const amount = Number(r.cancellation?.refundAmount ?? 0);
    if (amount <= 0 || !r.paymentId) continue;
    const refunds = await db.collection("payments").where("parentPaymentId", "==", r.paymentId).where("type", "==", "refund").get();
    const mine = refunds.docs.filter((x) => ["succeeded", "initiated"].includes(String(x.get("status"))));
    if (mine.some((x) => x.get("status") === "succeeded") && !mine.some((x) => x.get("status") === "initiated")) {
      await d.ref.update({ status: "refunded", "cancellation.refundStatus": "succeeded", updatedAt: FieldValue.serverTimestamp() });
      out.settled++;
      continue;
    }
    if (mine.length > 0) {
      // En cours chez le prestataire, ou virement à rembourser à la main : signalé une fois après 72 h.
      const since = (r.cancellation?.at as Timestamp | undefined)?.toMillis() ?? now;
      if (now - since > 72 * 3_600_000 && !r.cancellation?.refundEscalatedAt) {
        await escalate(d.id, r, amount, "Remboursement en cours depuis plus de 72 h (prestataire ou virement à faire à la main).");
        out.escalated++;
      }
      continue;
    }
    const attempts = Number(r.cancellation?.refundAttempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) continue;
    try {
      const res = await issueRefund(String(r.paymentId), amount, `retry_${r.cancellation?.reason ?? "cancellation"}`);
      out.retried++;
      await d.ref.update({
        "cancellation.refundAttempts": attempts + 1,
        "cancellation.lastRefundAttemptAt": FieldValue.serverTimestamp(),
        ...(res.status === "succeeded" ? { status: "refunded", "cancellation.refundStatus": "succeeded" } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (res.status === "succeeded") out.succeeded++;
    } catch (e) {
      await d.ref.update({ "cancellation.refundAttempts": attempts + 1, "cancellation.lastRefundError": String(e).slice(0, 300), "cancellation.lastRefundAttemptAt": FieldValue.serverTimestamp() });
      logger.error("Relance de remboursement échouée", { reservationId: d.id, attempt: attempts + 1, error: String(e) });
      if (attempts + 1 >= MAX_ATTEMPTS && !r.cancellation?.refundEscalatedAt) {
        await escalate(d.id, r, amount, `Le remboursement a échoué ${MAX_ATTEMPTS} fois chez le prestataire : à faire à la main.`);
        out.escalated++;
      }
    }
  }
  if (out.retried || out.settled || out.escalated) logger.info("Relance des remboursements", out);
  return out;
}

async function escalate(reservationId: string, r: FirebaseFirestore.DocumentData, amount: number, why: string) {
  await db.doc(`reservations/${reservationId}`).update({ "cancellation.refundEscalatedAt": FieldValue.serverTimestamp() });
  const title = String(r.sessionSnapshot?.title?.fr ?? "");
  const team = await db.collection("users").where("role", "in", ["admin", "superadmin"]).limit(20).get();
  const mail = teamAlertMail({ subject: "Remboursement bloqué", paragraphs: [`${dh(amount)} à rembourser pour « ${title} ».`, why], path: "/admin/remboursements" });
  await Promise.all(team.docs.map((u) => u.get("email") as string | undefined).filter((e): e is string => Boolean(e)).map((to) => sendMail({ to, locale: "fr", ...mail, kind: "team_alert", refs: { reservationId } }).catch(() => undefined)));
  const p = await personOf(r.userId);
  const localTitle = String(r.sessionSnapshot?.title?.[p.locale] ?? title);
  if (p.email) await sendMail({ to: p.email, locale: p.locale, ...refundPendingMail({ locale: p.locale, firstName: p.firstName, title: localTitle, amount: dh(amount), reservationId }), kind: "refund_pending", refs: { reservationId } }).catch(() => undefined);
}

export const refundRetries = onSchedule({ schedule: "every 60 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  await retryPendingRefunds();
});
