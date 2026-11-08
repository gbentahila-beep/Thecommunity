import { formatRib } from "@thecommunity/shared";
import { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { dateTimeFor, money } from "../invoices/format";
import { db } from "../lib/admin";
import { sendMail } from "../mail/mailer";
import { transferExpiredMail, transferInstructionsMail } from "../mail/templates";
import { bankDetails } from "./provider";

async function recipient(userId: string) {
  const u = (await db.doc(`users/${userId}`).get()).data() ?? {};
  return { to: u.email as string | undefined, locale: (u.locale as string | undefined) ?? "fr", firstName: (u.firstName as string | undefined) ?? "", name: [u.firstName, u.lastName].filter(Boolean).join(" ") || undefined };
}

/** E-mail des instructions de virement (référence, montant, coordonnées, échéance). N'échoue jamais l'appel. */
export async function sendTransferInstructions(paymentId: string): Promise<void> {
  try {
    const p = (await db.doc(`payments/${paymentId}`).get()).data();
    const bank = await bankDetails();
    if (!p || !bank || !p.reference) return;
    const who = await recipient(p.userId);
    if (!who.to) return;
    let what = "Abonnement The Host Club";
    if (p.reservationId) {
      const r = (await db.doc(`reservations/${p.reservationId}`).get()).data();
      what = r?.sessionSnapshot?.title?.[who.locale] ?? r?.sessionSnapshot?.title?.fr ?? "The Host Club";
    }
    const deadline = p.transferDeadline instanceof Timestamp ? dateTimeFor(p.transferDeadline.toDate(), who.locale) : null;
    const mail = transferInstructionsMail({
      locale: who.locale, firstName: who.firstName, what, amount: money(p.amount, p.currency), reference: p.reference, deadline,
      holder: bank.holder, bank: bank.bank, rib: formatRib(bank.rib), iban: bank.iban, swift: bank.swift, paymentId,
    });
    await sendMail({ to: who.to, toName: who.name, locale: who.locale, ...mail, kind: "transfer_instructions", refs: { paymentId, ...(p.reservationId ? { reservationId: p.reservationId } : {}) } });
  } catch (e) {
    logger.error("E-mail de virement impossible", { paymentId, error: String(e) });
  }
}

/** E-mail « virement non reçu, place libérée ». */
export async function sendTransferExpired(reservationId: string): Promise<void> {
  try {
    const r = (await db.doc(`reservations/${reservationId}`).get()).data();
    if (!r || r.paymentMethod !== "bank_transfer") return;
    const who = await recipient(r.userId);
    if (!who.to) return;
    const title = r.sessionSnapshot?.title?.[who.locale] ?? r.sessionSnapshot?.title?.fr ?? "The Host Club";
    const mail = transferExpiredMail({ locale: who.locale, firstName: who.firstName, title, reference: r.transferReference ?? "", reservationId });
    await sendMail({ to: who.to, toName: who.name, locale: who.locale, ...mail, kind: "transfer_expired", refs: { reservationId } });
  } catch (e) {
    logger.error("E-mail d'expiration de virement impossible", { reservationId, error: String(e) });
  }
}
