import { MEMBERSHIP_WITHDRAWAL_DAYS, withdrawalRefusal } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireAuth } from "../lib/guards";
import { sendMail } from "../mail/mailer";
import { withdrawalMail } from "../mail/member-templates";
import { teamAlertMail } from "../mail/templates";
import { personOf } from "../notify/reminders";
import { issueRefund } from "../payments/refund";
import { refuse } from "../reservations/refuse";

const dh = (c: number) => `${(c / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;
const ms = (v: unknown) => (v instanceof Timestamp ? v.toMillis() : 0);

/** Date d'achat retenue : la confirmation du paiement (à défaut, sa création). */
export const purchasedAtOf = (p: FirebaseFirestore.DocumentData) => new Date(ms(p.succeededAt) || ms(p.updatedAt) || ms(p.createdAt));

/** Le carnet ou le pass de ce paiement a-t-il servi depuis l'achat ? (mêmes chiffres pour la page et le serveur) */
export async function usageSince(uid: string, p: FirebaseFirestore.DocumentData) {
  const since = Timestamp.fromDate(purchasedAtOf(p));
  const [res, carnet] = await Promise.all([
    p.kind === "carnet" ? Promise.resolve(null) : db.collection("reservations").where("userId", "==", uid).where("createdAt", ">=", since).get(),
    p.kind === "carnet" ? db.doc(`carnets/${uid}`).get() : Promise.resolve(null),
  ]);
  const passSeatsUsedSince = (res?.docs ?? []).filter((d) => Number(d.get("pricing.coverage.passSeats") ?? 0) > 0 && ["pending_payment", "confirmed", "attended", "no_show"].includes(String(d.get("status")))).length;
  const c = carnet?.data();
  const creditsLeft = c && ms(c.expiresAt) > Date.now() ? Number(c.credits ?? 0) : 0;
  return { passSeatsUsedSince, creditsLeft, creditsBought: Number(p.credits ?? 0) };
}

/**
 * Audit du 23/11 — « Me rétracter » (CGV § 6) : dans les 7 jours suivant l'achat, si rien n'a servi, le carnet ou le
 * pass est annulé et remboursé intégralement (avoir émis). Pass : sa durée est retirée de la fin du pass ; carnet :
 * ses crédits sont retirés. Par virement, le remboursement se fait à la main par l'équipe (prévenue).
 */
export const withdrawMembership = onCall({ region: REGION }, async (req) => {
  const { uid } = requireAuth(req);
  const v = z.object({ paymentId: z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/) }).safeParse(req.data);
  if (!v.success) invalidArgument(v.error.issues);
  const payRef = db.doc(`payments/${v.data.paymentId}`);
  const p0 = (await payRef.get()).data();
  if (!p0 || p0.userId !== uid || p0.purpose !== "membership" || p0.type !== "payment") throw new HttpsError("not-found", "Achat introuvable.", { reason: "not_found" });
  const usage = await usageSince(uid, p0);
  const why = withdrawalRefusal({ status: String(p0.status), kind: p0.kind === "carnet" ? "carnet" : "pass", purchasedAt: purchasedAtOf(p0), withdrawnAt: p0.withdrawnAt ? new Date(ms(p0.withdrawnAt)) : null, ...usage });
  if (why) refuse(why, `Rétractation impossible (${MEMBERSHIP_WITHDRAWAL_DAYS} jours, rien d'utilisé).`);

  const kind = p0.kind === "carnet" ? "carnet" : "pass";
  const days = Number(p0.days ?? 0);
  await db.runTransaction(async (tx) => {
    const memRef = db.doc(`memberships/${uid}`);
    const carRef = db.doc(`carnets/${uid}`);
    const [pay, mem, car] = await Promise.all([tx.get(payRef), kind === "pass" ? tx.get(memRef) : Promise.resolve(null), kind === "carnet" ? tx.get(carRef) : Promise.resolve(null)]);
    if (pay.data()?.withdrawnAt) refuse("already_withdrawn", "Déjà rétracté.");
    tx.update(payRef, { withdrawnAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    if (kind === "pass" && mem?.exists) {
      const end = ms(mem.data()!.endAt) - days * 86_400_000;
      const over = end <= Date.now();
      tx.update(memRef, { endAt: Timestamp.fromMillis(Math.max(end, Date.now())), ...(over ? { status: "revoked", revokeReason: "withdrawal", revokedAt: FieldValue.serverTimestamp() } : {}), updatedAt: FieldValue.serverTimestamp() });
      tx.set(memRef.collection("periods").doc(payRef.id), { withdrawnAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    if (kind === "carnet" && car?.exists) {
      const take = Math.min(Number(car.data()!.credits ?? 0), Number(p0.credits ?? 0));
      tx.update(carRef, { credits: FieldValue.increment(-take), updatedAt: FieldValue.serverTimestamp() });
      tx.set(carRef.collection("movements").doc(), { delta: -take, reason: "withdrawal", paymentId: payRef.id, at: FieldValue.serverTimestamp() });
    }
    tx.set(db.collection(`users/${uid}/notifications`).doc(), {
      type: "membership_withdrawn",
      title: { fr: "Rétractation confirmée", ar: "تم تأكيد التراجع", en: "Withdrawal confirmed" },
      body: { fr: `${p0.label ?? "Votre achat"} est annulé ; ${dh(Number(p0.amount))} vous sont remboursés.`, ar: `تم الإلغاء؛ سيتم استرجاع ${dh(Number(p0.amount))}.`, en: `${p0.label ?? "Your purchase"} is cancelled; ${dh(Number(p0.amount))} is refunded.` },
      link: "/espace/factures",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  let pending = false;
  try {
    pending = (await issueRefund(payRef.id, Number(p0.amount), "membership_withdrawal")).status !== "succeeded";
  } catch (e) {
    pending = true;
    logger.error("Rétractation : remboursement à faire", { paymentId: payRef.id, error: String(e) });
    await payRef.update({ withdrawalRefundError: String(e).slice(0, 300) }).catch(() => undefined);
  }
  if (pending) {
    const team = await db.collection("users").where("role", "in", ["admin", "superadmin"]).limit(20).get();
    const mail = teamAlertMail({ subject: "Rétractation : remboursement à faire", paragraphs: [`${p0.label ?? "Carnet ou pass"} — ${dh(Number(p0.amount))} à rembourser (rétractation dans les 7 jours).`, "Le pass ou les crédits ont déjà été retirés. Marquez le remboursement comme effectué une fois fait."], path: "/admin/remboursements" });
    await Promise.all(team.docs.map((u) => u.get("email") as string | undefined).filter((e): e is string => Boolean(e)).map((to) => sendMail({ to, locale: "fr", ...mail, kind: "team_alert", refs: { paymentId: payRef.id } }).catch(() => undefined)));
  }
  const person = await personOf(uid);
  if (person.email) await sendMail({ to: person.email, locale: person.locale, ...withdrawalMail({ locale: person.locale, firstName: person.firstName, offer: String(p0.label ?? ""), amount: dh(Number(p0.amount)), pending }), kind: "membership_withdrawal", refs: { paymentId: payRef.id } }).catch(() => undefined);
  await audit({ actorUid: uid, actorRole: "user", action: "membership.withdraw", targetType: "payment", targetId: payRef.id, after: { kind, amount: p0.amount, pending } });
  return { ok: true, refundStatus: pending ? "pending" : "succeeded" };
});
