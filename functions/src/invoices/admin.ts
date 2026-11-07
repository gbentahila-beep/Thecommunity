import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { audit } from "../lib/audit";
import { db, FieldValue, REGION } from "../lib/admin";
import { invalidArgument, requireRole, roleOf } from "../lib/guards";
import { emailInvoice, ensureCreditNote, ensureInvoice } from "./issue";

const idSchema = z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);

/**
 * Back-office (Paiements) : émettre le document d'un paiement qui n'en a pas (paiements antérieurs à la 5c)
 * ou le renvoyer par e-mail. Idempotent ; journalisé.
 */
export const adminInvoiceAction = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["admin", "superadmin"]);
  const parsed = z.object({ paymentId: idSchema, action: z.enum(["issue", "resend"]) }).safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const { paymentId, action } = parsed.data;
  const p = (await db.doc(`payments/${paymentId}`).get()).data();
  if (!p) throw new HttpsError("not-found", "Paiement introuvable.", { reason: "not_found" });
  const doc = p.type === "refund" ? await ensureCreditNote(paymentId) : await ensureInvoice(paymentId);
  if (!doc) throw new HttpsError("failed-precondition", "Aucun document pour ce paiement (non encaissé ou gratuit).", { reason: "not_billable" });
  const mail = action === "resend" ? await emailInvoice(doc.id) : null;
  await audit({ actorUid: actor.uid, actorRole: roleOf(req), action: `invoice.${action}`, targetType: "invoice", targetId: doc.id, after: { paymentId, created: doc.created, mail: mail?.status ?? null } });
  return { invoiceId: doc.id, created: doc.created, mailStatus: mail?.status ?? null };
});

const companySchema = z.object({
  legalName: z.string().trim().max(120),
  address: z.string().trim().max(300),
  ice: z.string().trim().regex(/^(\d{15})?$/, "ice"),
  if: z.string().trim().max(30),
  rc: z.string().trim().max(60),
  email: z.string().trim().max(120).regex(/^([^@\s]+@[^@\s]+\.[^@\s]+)?$/, "email"),
  vatRate: z.number().min(0).max(30).nullable(),
  mailProvider: z.enum(["outbox", "brevo"]),
  fromName: z.string().trim().max(80),
  fromEmail: z.string().trim().max(120).regex(/^([^@\s]+@[^@\s]+\.[^@\s]+)?$/, "email"),
});

/** Paramètres → Société et e-mails (super-admin) : informations figées sur chaque nouvelle facture. Journalisé. */
export const adminSaveCompanySettings = onCall({ region: REGION }, async (req) => {
  const actor = requireRole(req, ["superadmin"]);
  const parsed = companySchema.safeParse(req.data);
  if (!parsed.success) invalidArgument(parsed.error.issues);
  const v = parsed.data;
  const company = { legalName: v.legalName, address: v.address, ice: v.ice, if: v.if, rc: v.rc, email: v.email, vatRate: v.vatRate };
  const email = { provider: v.mailProvider, fromName: v.fromName, fromEmail: v.fromEmail };
  const [beforeCompany, beforeEmail] = await Promise.all([db.doc("settings/company").get(), db.doc("settings/email").get()]);
  const batch = db.batch();
  batch.set(db.doc("settings/company"), { ...company, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  batch.set(db.doc("settings/email"), { ...email, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await batch.commit();
  await audit({
    actorUid: actor.uid,
    actorRole: roleOf(req),
    action: "settings.company",
    targetType: "settings",
    targetId: "company",
    before: { company: beforeCompany.data() ?? null, email: beforeEmail.data() ?? null },
    after: { company, email },
  });
  return { ok: true };
});
