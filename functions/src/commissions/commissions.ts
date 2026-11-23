import { commissionRuleInputSchema, payoutBankSchema, PAYOUT_DELAY_DAYS } from "@thecommunity/shared";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { auth, db, FieldValue, REGION } from "../lib/admin";
import { audit } from "../lib/audit";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { organizerMail } from "../mail/templates";
import { sendMail } from "../mail/mailer";
import { requireOrganizer } from "../organizers/access";
import { refuse } from "../reservations/refuse";
import { clearCommissionCache, eligibleForPayout } from "./ledger";

const ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Étape 21 — nouvelle règle de commission (super-admin, journalisée). Une règle ne se modifie pas : on en crée une autre. */
export const adminSaveCommissionRule = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = commissionRuleInputSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  const targetId = v.scope === "global" ? null : v.targetId!;
  if (targetId) {
    if (!ID.test(targetId)) invalidArgument([{ path: ["targetId"], message: "required" }]);
    const col = { experience: "experiences", organizer: "organizers", category: "categories" }[v.scope as "experience" | "organizer" | "category"];
    if (!(await db.doc(`${col}/${targetId}`).get()).exists) invalidArgument([{ path: ["targetId"], message: "required" }]);
  }
  const ref = db.collection("commissionRules").doc();
  const doc = {
    scope: v.scope,
    targetId,
    ratePercent: Math.round(v.ratePercent * 100) / 100,
    fixedPerSeat: Math.round((v.fixedPerSeatDh ?? 0) * 100),
    effectiveFrom: v.effectiveFrom,
    active: true,
    note: v.note || "",
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
  };
  await ref.set(doc);
  clearCommissionCache();
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "commission.rule.create", targetType: "commissionRule", targetId: ref.id, after: { ...doc, createdAt: null } });
  return { ruleId: ref.id };
});

/** Désactiver / réactiver une règle (gardée pour l'historique). */
export const adminSetCommissionRuleActive = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = z.object({ ruleId: z.string().regex(ID), active: z.boolean() }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`commissionRules/${parsed.data.ruleId}`);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Règle introuvable.", { reason: "not_found" });
  await ref.update({ active: parsed.data.active, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  clearCommissionCache();
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: parsed.data.active ? "commission.rule.enable" : "commission.rule.disable", targetType: "commissionRule", targetId: parsed.data.ruleId });
  return { ok: true };
});

/** Coordonnées de reversement de l'organisateur (son RIB professionnel). */
export const organizerSaveBankDetails = onCall({ region: REGION }, async (req) => {
  const o = await requireOrganizer(req, { approvedOnly: true });
  const parsed = payoutBankSchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  await db.doc(`organizers/${o.orgId}/private/details`).set({ bank: { ...parsed.data, updatedAt: FieldValue.serverTimestamp(), updatedBy: o.uid } }, { merge: true });
  await audit({ actorUid: o.uid, actorRole: "organizer", action: "organizer.bank", targetType: "organizer", targetId: o.orgId, after: { rib: `…${parsed.data.rib.slice(-4)}` } });
  return { ok: true };
});

/**
 * Prépare un reversement : toutes les écritures « dues » de l'organisateur dont l'activité est passée
 * (ventes moins remboursements). Refusé si le solde n'est pas positif ou si le RIB manque.
 */
export const adminCreatePayout = onCall({ region: REGION, timeoutSeconds: 120 }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ organizerId: z.string().regex(ID) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { organizerId } = parsed.data;
  const details = (await db.doc(`organizers/${organizerId}/private/details`).get()).data();
  if (!details) throw new HttpsError("not-found", "Organisateur introuvable.", { reason: "not_found" });
  if (!details.bank?.rib) refuse("missing_bank_details", "L'organisateur n'a pas encore indiqué son RIB.");
  const now = Date.now();
  const due = (await db.collection("commissionLedger").where("organizerId", "==", organizerId).where("status", "==", "due").get()).docs.filter((d) => eligibleForPayout(d.get("sessionStartAt"), now, PAYOUT_DELAY_DAYS));
  const sum = (k: string) => due.reduce((a, d) => a + Number(d.get(k) ?? 0), 0);
  const amount = sum("payable");
  if (due.length === 0 || amount <= 0) refuse("nothing_to_pay", "Rien à reverser pour l'instant.");
  const ref = db.collection("payouts").doc();
  const payout = {
    organizerId,
    amount,
    gross: sum("gross"),
    commission: sum("commission"),
    entries: due.length,
    status: "pending",
    bank: { holder: details.bank.holder, bankName: details.bank.bankName, ribLast4: String(details.bank.rib).slice(-4) },
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actor.uid,
  };
  // Lots de 400 écritures (limite des écritures groupées).
  for (let i = 0; i < due.length; i += 400) {
    const batch = db.batch();
    if (i === 0) batch.set(ref, payout);
    for (const d of due.slice(i, i + 400)) batch.update(d.ref, { status: "in_payout", payoutId: ref.id });
    await batch.commit();
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "payout.create", targetType: "payout", targetId: ref.id, after: { organizerId, amount, entries: due.length } });
  return { payoutId: ref.id, amount, entries: due.length };
});

/** Virement fait par l'équipe : référence bancaire enregistrée, écritures « payées », organisateur prévenu. */
export const adminMarkPayoutPaid = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ payoutId: z.string().regex(ID), reference: z.string().trim().min(3, "required").max(80, "tooLong") }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const ref = db.doc(`payouts/${parsed.data.payoutId}`);
  const p = (await ref.get()).data();
  if (!p) throw new HttpsError("not-found", "Reversement introuvable.", { reason: "not_found" });
  if (p.status !== "pending") refuse("already_paid", "Ce reversement est déjà marqué payé.");
  const entries = await db.collection("commissionLedger").where("payoutId", "==", ref.id).get();
  for (let i = 0; i < Math.max(1, entries.size); i += 400) {
    const batch = db.batch();
    if (i === 0) batch.update(ref, { status: "paid", reference: parsed.data.reference, paidAt: FieldValue.serverTimestamp(), paidBy: actor.uid });
    for (const d of entries.docs.slice(i, i + 400)) batch.update(d.ref, { status: "paid" });
    await batch.commit();
  }
  const details = (await db.doc(`organizers/${p.organizerId}/private/details`).get()).data() ?? {};
  const amount = `${(Number(p.amount) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DH`;
  for (const uid of (details.memberUids as string[] | undefined) ?? []) {
    await db.collection(`users/${uid}/notifications`).add({ type: "payout_paid", title: { fr: "Reversement effectué", ar: "Reversement effectué", en: "Payout sent" }, body: { fr: `${amount} ont été virés sur votre compte (référence ${parsed.data.reference}).`, ar: `${amount}`, en: `${amount} sent (reference ${parsed.data.reference}).` }, link: "/pro/finances", createdAt: FieldValue.serverTimestamp() });
    const u = await auth.getUser(uid).catch(() => null);
    if (u?.email) await sendMail({ to: u.email, locale: "fr", ...organizerMail({ heading: "Reversement effectué", paragraphs: [`${amount} ont été virés sur votre compte bancaire (référence ${parsed.data.reference}).`, "Le détail des réservations concernées est dans votre espace, rubrique « Finances »."], ctaLabel: "Voir mes finances", path: "/pro/finances" }), kind: "payout_paid", refs: { payoutId: ref.id } }).catch(() => undefined);
  }
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: "payout.paid", targetType: "payout", targetId: ref.id, after: { reference: parsed.data.reference, amount: p.amount } });
  return { ok: true };
});
