import type { Timestamp } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";
import { dateTimeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { cancelledByTeamMail } from "../mail/member-templates";
import { personOf } from "./reminders";

const dh = (centimes: number) => `${(centimes / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} DH`;

/**
 * Audit du 23/11 : une annulation décidée par l'équipe (réservation, date entière, suspension) est TOUJOURS
 * annoncée par notification ET par e-mail (information essentielle : envoyé même si la personne a coupé les rappels).
 */
export async function notifyCancelledByTeam(reservationId: string, refundAmount: number, o: { sessionReason?: string } = {}) {
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r) return;
  const p = await personOf(r.userId);
  const title = String(r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "");
  const titleFr = String(r.sessionSnapshot?.title?.fr ?? "");
  const startAt = (r.sessionSnapshot?.startAt as Timestamp).toDate();
  const refundPending = refundAmount > 0 && r.status !== "refunded";
  const session = Boolean(o.sessionReason);
  await db.collection(`users/${r.userId}/notifications`).add({
    type: "event_cancelled",
    title: session ? { fr: "Expérience annulée", ar: "تم إلغاء التجربة", en: "Experience cancelled" } : { fr: "Votre réservation a été annulée", ar: "تم إلغاء حجزك", en: "Your booking was cancelled" },
    body: session
      ? {
          fr: `Nous sommes désolés : « ${titleFr} » est annulée (${o.sessionReason}).${refundAmount > 0 ? ` ${dh(refundAmount)} vous sont remboursés intégralement.` : ""}`,
          ar: `نعتذر: تم إلغاء هذا الموعد (${o.sessionReason}).${refundAmount > 0 ? ` سيتم استرجاع ${dh(refundAmount)} بالكامل.` : ""}`,
          en: `We're sorry: “${titleFr}” is cancelled (${o.sessionReason}).${refundAmount > 0 ? ` ${dh(refundAmount)} is fully refunded.` : ""}`,
        }
      : refundAmount > 0
        ? { fr: `L'équipe a annulé votre réservation. ${dh(refundAmount)} vous sont remboursés.`, ar: `ألغى الفريق حجزك. سيتم استرجاع ${dh(refundAmount)}.`, en: `The team cancelled your booking. ${dh(refundAmount)} is refunded.` }
        : { fr: "L'équipe a annulé votre réservation. Contactez-nous pour toute question.", ar: "ألغى الفريق حجزك. تواصل معنا لأي استفسار.", en: "The team cancelled your booking. Contact us with any question." },
    link: `/espace/reservations/${reservationId}`,
    createdAt: FieldValue.serverTimestamp(),
  });
  if (!p.email) return;
  await sendMail({
    to: p.email,
    locale: p.locale,
    ...cancelledByTeamMail({ locale: p.locale, firstName: p.firstName, title, when: dateTimeFor(startAt, p.locale), refund: refundAmount > 0 ? dh(refundAmount) : null, refundPending, sessionReason: o.sessionReason ?? null, reservationId }),
    kind: session ? "session_cancelled" : "reservation_cancelled_by_team",
    refs: { reservationId },
  });
}
