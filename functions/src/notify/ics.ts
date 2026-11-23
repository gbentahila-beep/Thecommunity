import { buildIcs } from "@thecommunity/shared";
import type { DocumentData, Timestamp } from "firebase-admin/firestore";
import { SITE_URL } from "../invoices/format";
import type { MailAttachment } from "../mail/mailer";
import { cityNameOf } from "./reminders";

/**
 * Audit du 23/11 — invitation agenda jointe aux e-mails (confirmation, lieu révélé, changement de date ou de lieu).
 * Lieu exact s'il est communiqué, sinon la ville (lieu secret). Même identifiant que le bouton du site.
 */
export async function icsAttachment(reservationId: string, r: DocumentData, locale = "fr", o: { cancelled?: boolean } = {}): Promise<MailAttachment> {
  const title = String(r.sessionSnapshot?.title?.[locale] ?? r.sessionSnapshot?.title?.fr ?? "Wenzy");
  const location = r.venue?.name ? `${r.venue.name}, ${r.venue.address ?? ""}`.replace(/, $/, "") : await cityNameOf(r.cityId, locale);
  const ics = buildIcs({
    uid: reservationId,
    title,
    startAt: (r.sessionSnapshot.startAt as Timestamp).toDate(),
    endAt: (r.sessionSnapshot.endAt as Timestamp).toDate(),
    location,
    geo: r.venue?.geo ?? null,
    url: `${SITE_URL}${locale === "fr" ? "" : `/${locale}`}/espace/reservations/${reservationId}`,
    cancelled: o.cancelled === true,
  });
  return { filename: "wenzy.ics", content: Buffer.from(ics, "utf8").toString("base64"), contentType: "text/calendar" };
}
