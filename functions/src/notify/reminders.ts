import { Timestamp, type DocumentData } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { db, FieldValue, REGION } from "../lib/admin";
import { dateTimeFor } from "../invoices/format";
import { sendMail } from "../mail/mailer";
import { changeMail, reminderMail } from "../mail/templates";
import { icsAttachment } from "./ics";

const HOUR = 3_600_000;

const cityNames = new Map<string, Record<string, string>>();
/** Nom de la ville de la réservation, dans la langue de la personne (audit 23/11 : plus de « Casablanca » écrit en dur). */
export async function cityNameOf(cityId: string | undefined, locale: string): Promise<string> {
  const id = cityId || "casablanca";
  if (!cityNames.has(id)) cityNames.set(id, ((await db.doc(`cities/${id}`).get()).get("name") as Record<string, string> | undefined) ?? {});
  const n = cityNames.get(id)!;
  return n[locale] ?? n.fr ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Où aller : le lieu exact s'il est communiqué ; sinon (lieu secret pas encore révélé) la ville seulement, jamais le quartier. */
export async function whereOf(r: DocumentData, locale = "fr"): Promise<string> {
  if (r.venue?.name) return `${r.venue.name}, ${r.venue.address ?? ""}`.replace(/, $/, "");
  return cityNameOf(r.cityId as string | undefined, locale);
}

export async function personOf(uid: string) {
  const u = (await db.doc(`users/${uid}`).get()).data() ?? {};
  return { email: u.email as string | undefined, locale: String(u.locale ?? "fr"), firstName: String(u.firstName ?? ""), emailOk: u.notificationPrefs?.email !== false };
}

/**
 * Rappels avant l'expérience : la veille (dans les 24 h) et 3 h avant. Notification dans l'espace membre
 * et e-mail (sauf si la personne a coupé les e-mails liés aux réservations). Chaque rappel n'est envoyé
 * qu'une fois : il est marqué sur la réservation avant l'envoi.
 */
export async function sendDueReminders(now = Date.now()): Promise<{ d1: number; h3: number }> {
  const snap = await db
    .collection("reservations")
    .where("status", "==", "confirmed")
    .where("sessionSnapshot.startAt", ">", Timestamp.fromMillis(now))
    .where("sessionSnapshot.startAt", "<=", Timestamp.fromMillis(now + 24 * HOUR))
    .get();
  const out = { d1: 0, h3: 0 };
  for (const doc of snap.docs) {
    const r = doc.data();
    const startMs = (r.sessionSnapshot.startAt as Timestamp).toMillis();
    const kind: "d1" | "h3" | null = startMs - now <= 3 * HOUR ? (r.reminders?.h3At ? null : "h3") : r.reminders?.d1At ? null : "d1";
    if (!kind) continue;
    // Réservée moins de 3 h avant : pas de rappel « la veille » en plus.
    const claimed = await db.runTransaction(async (tx) => {
      const fresh = (await tx.get(doc.ref)).data();
      if (!fresh || fresh.status !== "confirmed" || fresh.reminders?.[`${kind}At`]) return false;
      tx.update(doc.ref, { [`reminders.${kind}At`]: FieldValue.serverTimestamp(), ...(kind === "h3" && !fresh.reminders?.d1At ? { "reminders.d1At": FieldValue.serverTimestamp() } : {}) });
      return true;
    });
    if (!claimed) continue;
    const p = await personOf(r.userId);
    const title = r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "";
    const when = dateTimeFor(new Date(startMs), p.locale);
    await db.collection(`users/${r.userId}/notifications`).add({
      type: "reminder",
      title: kind === "d1" ? { fr: "C'est demain !", ar: "الموعد غدًا!", en: "It's tomorrow!" } : { fr: "Dans 3 heures", ar: "بعد 3 ساعات", en: "In 3 hours" },
      body: { fr: `${r.sessionSnapshot?.title?.fr ?? ""} · ${dateTimeFor(new Date(startMs), "fr")}`, ar: `${r.sessionSnapshot?.title?.ar ?? r.sessionSnapshot?.title?.fr ?? ""} · ${dateTimeFor(new Date(startMs), "ar")}`, en: `${r.sessionSnapshot?.title?.en ?? r.sessionSnapshot?.title?.fr ?? ""} · ${dateTimeFor(new Date(startMs), "en")}` },
      link: `/espace/reservations/${doc.id}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (p.email && p.emailOk) {
      await sendMail({ to: p.email, locale: p.locale, ...reminderMail({ locale: p.locale, kind, firstName: p.firstName, title, when, where: await whereOf(r, p.locale), reservationId: doc.id }), kind: `reminder_${kind}`, refs: { reservationId: doc.id } });
    }
    out[kind]++;
  }
  if (out.d1 || out.h3) logger.info("Rappels envoyés", out);
  return out;
}

export const sendReminders = onSchedule({ schedule: "every 15 minutes", region: REGION, timeZone: "Africa/Casablanca" }, async () => {
  await sendDueReminders();
});

/** Changement de date ou de lieu : notification + e-mail (toujours envoyé : information essentielle). */
export async function notifyReservationChange(reservationId: string, kind: "date" | "venue", o: { self?: boolean } = {}) {
  const r = (await db.doc(`reservations/${reservationId}`).get()).data();
  if (!r) return;
  const p = await personOf(r.userId);
  const title = r.sessionSnapshot?.title?.[p.locale] ?? r.sessionSnapshot?.title?.fr ?? "";
  const when = dateTimeFor((r.sessionSnapshot.startAt as Timestamp).toDate(), p.locale);
  if (kind === "venue") {
    await db.collection(`users/${r.userId}/notifications`).add({
      type: "event_updated",
      title: { fr: "Le lieu a changé", ar: "تغيّر المكان", en: "The venue has changed" },
      body: { fr: `Nouveau lieu : ${await whereOf(r)}.`, ar: `المكان الجديد: ${await whereOf(r, "ar")}.`, en: `New venue: ${await whereOf(r, "en")}.` },
      link: `/espace/reservations/${reservationId}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  if (p.email) {
    // Audit 23/11 : invitation agenda mise à jour jointe ; variante « changement fait par vous ».
    await sendMail({ to: p.email, locale: p.locale, ...changeMail({ locale: p.locale, kind, firstName: p.firstName, title, when, where: await whereOf(r, p.locale), reservationId, self: o.self }), attachments: [await icsAttachment(reservationId, r, p.locale)], kind: o.self ? "change_date_self" : `change_${kind}`, refs: { reservationId } });
  }
}
