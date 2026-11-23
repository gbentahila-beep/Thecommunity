import { needsTicket, SELF_CHECKIN_AFTER_MIN } from "@thecommunity/shared";
import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db, FieldValue } from "../lib/admin";
import { timeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { arrivalCheckMail } from "../mail/member-templates";
import { personOf } from "./reminders";

/**
 * Audit du 23/11 — « Vous êtes arrivé·e ? » à l'heure du début : notification et e-mail aux personnes confirmées qui
 * n'ont pas encore indiqué leur arrivée (le check-in évite d'être noté absent 1 h après le début). Événements au
 * check-in seulement (avec un billet scanné par une hôtesse ou l'organisateur, c'est le pointage qui fait foi).
 * Une seule fois par date (marquée sur la date avant l'envoi).
 */
export async function sendArrivalChecks(sessionId: string, s: DocumentData, e: DocumentData, now = Date.now()): Promise<number> {
  const start = (s.startAt as Timestamp).toMillis();
  if (now < start || now >= start + SELF_CHECKIN_AFTER_MIN * 60_000) return 0;
  const sessRef = db.doc(`sessions/${sessionId}`);
  const claimed = await db.runTransaction(async (tx) => {
    const cur = (await tx.get(sessRef)).data();
    if (!cur || cur.arrivalCheckAt) return false;
    tx.update(sessRef, { arrivalCheckAt: FieldValue.serverTimestamp() });
    return true;
  });
  if (!claimed) return 0;
  const res = await db.collection("reservations").where("sessionId", "==", sessionId).where("status", "==", "confirmed").get();
  const until = new Date(start + SELF_CHECKIN_AFTER_MIN * 60_000);
  let n = 0;
  for (const d of res.docs) {
    const r = d.data();
    if (r.arrivedAt || r.checkedInAt || needsTicket(e, r)) continue;
    const p = await personOf(r.userId);
    const title = String(r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "");
    await db.collection(`users/${r.userId}/notifications`).add({
      type: "arrival_check",
      title: { fr: "Vous êtes arrivé·e ?", ar: "هل وصلت؟", en: "Have you arrived?" },
      body: { fr: `Indiquez votre arrivée avant ${timeFor(until, "fr")} : votre groupe et le chat s'ouvrent, et votre place n'est pas notée comme une absence.`, ar: `سجّل وصولك قبل ${timeFor(until, "ar")}.`, en: `Check in before ${timeFor(until, "en")}: your group and chat open, and your spot isn't counted as a no-show.` },
      link: `/espace/reservations/${d.id}#arrivee`,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (p.email) await sendMail({ to: p.email, locale: p.locale, ...arrivalCheckMail({ locale: p.locale, firstName: p.firstName, title, until: timeFor(until, p.locale), reservationId: d.id }), kind: "arrival_check", refs: { reservationId: d.id } }).catch(() => undefined);
    n++;
  }
  return n;
}
