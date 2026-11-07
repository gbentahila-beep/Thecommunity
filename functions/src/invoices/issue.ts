import {
  companyReady,
  counterId,
  documentTitle,
  formatInvoiceNumber,
  invoiceSeries,
  invoiceYear,
  linesTotal,
  reservationLines,
  splitVat,
  type CompanyInfo,
  type InvoiceLine,
} from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions/v2";
import { db, FieldValue } from "../lib/admin";
import { membershipMail, refundMail, reservationConfirmedMail } from "../mail/templates";
import { sendMail } from "../mail/mailer";
import { dateFr, dateTimeFor, dateTimeFr, money } from "./format";
import { renderInvoicePdf } from "./pdf";
import type { InvoiceDoc } from "./types";

const iso = (v: unknown) => (v instanceof Timestamp ? v.toDate().toISOString() : typeof v === "string" ? v : new Date().toISOString());
const PAID = ["succeeded", "refunded", "partially_refunded"];

const REASONS: Record<string, string> = {
  member_cancellation: "Annulation par le membre",
  late_payment_no_seat: "Paiement reçu après le délai, plus de place disponible",
  amount_mismatch: "Montant reçu différent du montant dû",
  session_cancelled: "Date annulée par The Host Club",
};
const reasonLabel = (r: string) => REASONS[r] ?? (r.startsWith("admin_") ? "Annulation par The Host Club" : "Remboursement");

/** Société émettrice (Paramètres → Société) : figée sur chaque document au moment de l'émission. */
function companyFrom(d: DocumentData | undefined): { info: CompanyInfo | null; vatRate: number | null } {
  const vatRate = typeof d?.vatRate === "number" ? d.vatRate : null;
  if (!companyReady(d)) return { info: null, vatRate };
  const c = d as CompanyInfo;
  return {
    info: {
      legalName: c.legalName.trim(),
      address: c.address.trim(),
      ice: c.ice.trim(),
      ...(c.if ? { if: c.if } : {}),
      ...(c.rc ? { rc: c.rc } : {}),
      ...(c.email ? { email: c.email } : {}),
      vatRate,
    },
    vatRate,
  };
}

/** Numéro suivant d'une série, dans la transaction (continu, sans trou, jamais réattribué). */
async function nextNumber(tx: FirebaseFirestore.Transaction, series: Parameters<typeof counterId>[0], year: number) {
  const ref = db.doc(`counters/${counterId(series, year)}`);
  const snap = await tx.get(ref);
  const seq = ((snap.data()?.last as number | undefined) ?? 0) + 1;
  return { ref, seq, number: formatInvoiceNumber(series, year, seq) };
}

const toPdfDoc = (d: DocumentData): InvoiceDoc => ({ ...(d as InvoiceDoc), issuedAt: iso(d.issuedAt), payment: { ...d.payment, at: iso(d.payment?.at) } });

/** Génère (ou régénère) le PDF d'un document et le range dans un espace privé (lecture par le serveur seulement). */
export async function storeInvoicePdf(invoiceId: string): Promise<string> {
  const ref = db.doc(`invoices/${invoiceId}`);
  const d = (await ref.get()).data();
  if (!d) throw new Error(`Document introuvable : ${invoiceId}`);
  const bytes = await renderInvoicePdf(toPdfDoc(d));
  await getStorage().bucket().file(d.pdfPath).save(Buffer.from(bytes), { contentType: "application/pdf", resumable: false, metadata: { cacheControl: "private, max-age=0" } });
  await ref.update({ pdfReady: true });
  return d.pdfPath as string;
}

/**
 * Facture (ou reçu) d'un paiement encaissé. Idempotent : un paiement = un document (invoices/inv_{paymentId}).
 * Renvoie l'identifiant du document, et s'il vient d'être créé.
 */
export async function ensureInvoice(paymentId: string): Promise<{ id: string; created: boolean } | null> {
  const invRef = db.doc(`invoices/inv_${paymentId}`);
  const result = await db.runTransaction(async (tx) => {
    const [inv, pay, companySnap] = await Promise.all([tx.get(invRef), tx.get(db.doc(`payments/${paymentId}`)), tx.get(db.doc("settings/company"))]);
    if (inv.exists) return { created: false };
    const p = pay.data();
    if (!p || p.type !== "payment" || !PAID.includes(p.status) || !(p.amount > 0)) return null;
    const user = (await tx.get(db.doc(`users/${p.userId}`))).data() ?? {};
    const purpose: "reservation" | "membership" = p.purpose === "membership" ? "membership" : "reservation";
    let lines: InvoiceLine[];
    if (purpose === "reservation") {
      const r = (await tx.get(db.doc(`reservations/${p.reservationId}`))).data();
      const title = r?.sessionSnapshot?.title?.fr ?? "Expérience The Host Club";
      const start = r?.sessionSnapshot?.startAt instanceof Timestamp ? dateTimeFr(r.sessionSnapshot.startAt.toDate()) : "";
      const detail = [start, r?.sessionSnapshot?.district].filter(Boolean).join(" · ");
      lines = r?.pricing
        ? reservationLines({
            title, dateLabel: detail, seats: r.seats ?? 1, unitAmount: r.pricing.unitAmount, memberDiscount: r.pricing.memberDiscount ?? 0,
            discount: r.pricing.discount ?? 0, promoCode: r.pricing.promoCode, fees: r.pricing.fees ?? 0,
          })
        : [];
      if (linesTotal(lines) !== p.amount) lines = [{ label: title, detail, quantity: 1, unitAmount: p.amount, amount: p.amount }];
    } else {
      const [plan, period] = await Promise.all([tx.get(db.doc(`membershipPlans/${p.planId}`)), tx.get(db.doc(`memberships/${p.userId}/periods/${paymentId}`))]);
      const per = period.data();
      const detail = per ? `Du ${dateFr(per.startAt.toDate())} au ${dateFr(per.endAt.toDate())}` : "12 mois";
      lines = [{ label: `Abonnement ${plan.data()?.name?.fr ?? "annuel"}`, detail, quantity: 1, unitAmount: p.amount, amount: p.amount }];
    }
    const { info, vatRate } = companyFrom(companySnap.data());
    const test = p.mode === "test" || p.provider === "sandbox";
    const series = invoiceSeries("invoice", { test, companyReady: info !== null });
    const now = new Date();
    const year = invoiceYear(now);
    const counter = await nextNumber(tx, series, year);
    const doc = {
      kind: "invoice",
      series,
      number: counter.number,
      year,
      seq: counter.seq,
      test,
      legal: series === "FA",
      title: documentTitle(series).fr,
      userId: p.userId,
      paymentId,
      purpose,
      reservationId: p.reservationId ?? null,
      seller: info,
      buyer: { name: [user.firstName, user.lastName].filter(Boolean).join(" "), email: user.email ?? "" },
      lines,
      totals: splitVat(p.amount, vatRate),
      currency: p.currency ?? "MAD",
      payment: { provider: p.provider ?? "", mode: p.mode ?? "", at: p.updatedAt ?? Timestamp.fromDate(now) },
      issuedAt: Timestamp.fromDate(now),
      pdfPath: `invoices/${p.userId}/inv_${paymentId}.pdf`,
      pdfReady: false,
    };
    tx.set(counter.ref, { series, year, last: counter.seq, updatedAt: FieldValue.serverTimestamp() });
    tx.set(invRef, doc);
    tx.update(db.doc(`payments/${paymentId}`), { invoiceId: invRef.id, invoiceNumber: counter.number });
    return { created: true };
  });
  if (!result) return null;
  if (result.created || !(await invRef.get()).data()?.pdfReady) await storeInvoicePdf(invRef.id);
  return { id: invRef.id, created: result.created };
}

/** Avoir (ou reçu de remboursement) d'un remboursement réussi, rattaché à la facture du paiement d'origine. */
export async function ensureCreditNote(refundId: string): Promise<{ id: string; created: boolean } | null> {
  const refund = (await db.doc(`payments/${refundId}`).get()).data();
  if (!refund || refund.type !== "refund" || refund.status !== "succeeded" || !(refund.amount > 0)) return null;
  const parent = await ensureInvoice(refund.parentPaymentId);
  if (!parent) return null;
  const invRef = db.doc(`invoices/cn_${refundId}`);
  const result = await db.runTransaction(async (tx) => {
    const [inv, parentInv, companySnap] = await Promise.all([tx.get(invRef), tx.get(db.doc(`invoices/${parent.id}`)), tx.get(db.doc("settings/company"))]);
    if (inv.exists) return { created: false };
    const pi = parentInv.data()!;
    const { info, vatRate } = companyFrom(companySnap.data());
    const series = invoiceSeries("credit_note", { test: pi.test, companyReady: info !== null });
    const now = new Date();
    const year = invoiceYear(now);
    const counter = await nextNumber(tx, series, year);
    const what = (pi.lines as InvoiceLine[])[0]?.label ?? "Achat";
    const doc = {
      kind: "credit_note",
      series,
      number: counter.number,
      year,
      seq: counter.seq,
      test: pi.test,
      legal: series === "AV",
      title: documentTitle(series).fr,
      userId: refund.userId,
      paymentId: refundId,
      purpose: pi.purpose,
      reservationId: refund.reservationId ?? pi.reservationId ?? null,
      relatedInvoiceId: parent.id,
      relatedInvoiceNumber: pi.number,
      reasonLabel: reasonLabel(String(refund.reason ?? "")),
      seller: info,
      buyer: pi.buyer,
      lines: [{ label: `Remboursement — ${what}`, quantity: 1, unitAmount: refund.amount, amount: refund.amount }],
      totals: splitVat(refund.amount, vatRate ?? pi.totals?.rate ?? null),
      currency: refund.currency ?? pi.currency,
      payment: { provider: refund.provider ?? "", mode: refund.mode ?? "", at: refund.updatedAt ?? Timestamp.fromDate(now) },
      issuedAt: Timestamp.fromDate(now),
      pdfPath: `invoices/${refund.userId}/cn_${refundId}.pdf`,
      pdfReady: false,
    };
    tx.set(counter.ref, { series, year, last: counter.seq, updatedAt: FieldValue.serverTimestamp() });
    tx.set(invRef, doc);
    tx.update(db.doc(`payments/${refundId}`), { invoiceId: invRef.id, invoiceNumber: counter.number });
    return { created: true };
  });
  if (result.created || !(await invRef.get()).data()?.pdfReady) await storeInvoicePdf(invRef.id);
  return { id: invRef.id, created: result.created };
}

/** E-mail accompagnant un document (confirmation + facture, abonnement + facture, remboursement + avoir). */
export async function emailInvoice(invoiceId: string): Promise<{ id: string; status: string } | null> {
  const invRef = db.doc(`invoices/${invoiceId}`);
  const inv = (await invRef.get()).data();
  if (!inv) return null;
  const user = (await db.doc(`users/${inv.userId}`).get()).data() ?? {};
  const to = (user.email as string | undefined) ?? inv.buyer?.email;
  if (!to) return null;
  const locale = (user.locale as string | undefined) ?? "fr";
  const firstName = (user.firstName as string | undefined) ?? "";
  const total = money(inv.totals.ttc, inv.currency);
  let mail: { subject: string; html: string; text: string };
  if (inv.kind === "credit_note") {
    mail = refundMail({ locale, firstName, what: String(inv.lines[0]?.label ?? "").replace(/^Remboursement — /, ""), amount: total, number: inv.number, relatedNumber: inv.relatedInvoiceNumber ?? "", test: inv.test });
  } else if (inv.purpose === "membership") {
    const mem = (await db.doc(`memberships/${inv.userId}`).get()).data();
    const until = mem?.endAt instanceof Timestamp ? dateFr(mem.endAt.toDate()) : "";
    mail = membershipMail({ locale, firstName, planName: String(inv.lines[0]?.label ?? "").replace(/^Abonnement /, ""), until, total, number: inv.number, test: inv.test });
  } else {
    const r = (await db.doc(`reservations/${inv.reservationId}`).get()).data();
    const title = r?.sessionSnapshot?.title?.[locale] ?? r?.sessionSnapshot?.title?.fr ?? inv.lines[0]?.label ?? "";
    const when = r?.sessionSnapshot?.startAt instanceof Timestamp ? dateTimeFor(r.sessionSnapshot.startAt.toDate(), locale) : "";
    mail = reservationConfirmedMail({ locale, firstName, title, when, seats: r?.seats ?? 1, total, number: inv.number, reservationId: inv.reservationId, test: inv.test });
  }
  const sent = await sendMail({
    to,
    toName: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    locale,
    ...mail,
    attachments: [{ filename: `${inv.number}.pdf`, storagePath: inv.pdfPath }],
    kind: inv.kind === "credit_note" ? "refund" : inv.purpose === "membership" ? "membership_invoice" : "reservation_invoice",
    refs: { invoiceId, paymentId: inv.paymentId, ...(inv.reservationId ? { reservationId: inv.reservationId } : {}) },
  });
  await invRef.update({ lastMailId: sent.id, lastMailStatus: sent.status, lastMailAt: FieldValue.serverTimestamp() });
  return sent;
}

/**
 * Point d'entrée après un encaissement ou un remboursement : document + e-mail (une seule fois).
 * Ne lève jamais : une facture ratée ne doit pas annuler un paiement ; l'équipe peut la réémettre (back-office).
 */
export async function afterPaymentSettled(o: { paymentId?: string; refundId?: string }) {
  try {
    const r = o.refundId ? await ensureCreditNote(o.refundId) : o.paymentId ? await ensureInvoice(o.paymentId) : null;
    if (r?.created) await emailInvoice(r.id);
  } catch (e) {
    logger.error("Facture / e-mail non émis", { ...o, error: String(e) });
  }
}
