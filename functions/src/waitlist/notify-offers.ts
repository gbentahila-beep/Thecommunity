import type { Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { db } from "../lib/admin";
import { dateTimeFor, money } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { waitlistOfferMail } from "../mail/member-templates";
import { personOf } from "../notify/reminders";
import { sendWhatsApp } from "../whatsapp/whatsapp";
import { SITE_URL } from "../invoices/format";

/**
 * Audit du 23/11 — une place libérée proposée depuis la liste d'attente (4 h pour payer) est annoncée par e-mail en plus
 * de la notification, et par WhatsApp si la personne l'a accepté dans son profil (modèle Meta « wenzy_place_liberee » ;
 * tant que l'envoi réel n'est pas activé, le message est rangé dans la boîte d'envoi WhatsApp du back-office).
 * Appelée APRÈS la transaction qui a créé les places proposées. Ne lève jamais.
 */
export async function notifyWaitlistOffers(reservationIds: string[]) {
  for (const id of reservationIds) {
    try {
      const r = (await db.doc(`reservations/${id}`).get()).data();
      if (!r) continue;
      const p = await personOf(r.userId);
      const u = (await db.doc(`users/${r.userId}`).get()).data() ?? {};
      const title = String(r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "");
      const when = dateTimeFor((r.sessionSnapshot.startAt as Timestamp).toDate(), p.locale);
      const free = r.status === "confirmed";
      const deadline = free ? null : dateTimeFor((r.holdExpiresAt as Timestamp).toDate(), p.locale);
      const amount = free ? null : money(Number(r.pricing?.total ?? 0), r.pricing?.currency);
      if (p.email) await sendMail({ to: p.email, locale: p.locale, ...waitlistOfferMail({ locale: p.locale, firstName: p.firstName, title, when, deadline, amount, reservationId: id }), kind: "waitlist_offer", refs: { reservationId: id } });
      if (u.whatsapp === true && u.phone) {
        const link = `${SITE_URL}/espace/reservations/${id}`;
        const text = free
          ? `Wenzy : une place s'est libérée pour « ${title} » (${when}). Elle est à vous ! ${link}`
          : `Wenzy : une place s'est libérée pour « ${title} » (${when}). Elle vous est réservée jusqu'au ${deadline} : payez ${amount} pour la confirmer. ${link}`;
        await sendWhatsApp({ to: String(u.phone), kind: "waitlist_offer", text, params: [p.firstName || "", title, when, deadline ?? "", link], refs: { reservationId: id } });
      }
    } catch (e) {
      logger.error("Annonce d'une place de la liste d'attente", { reservationId: id, error: String(e) });
    }
  }
}
