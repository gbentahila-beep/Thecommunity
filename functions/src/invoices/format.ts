import { MOROCCO_TIMEZONE } from "@thecommunity/shared";

/** Adresse publique du site (liens dans les e-mails). À définir par environnement (SITE_URL). */
export const SITE_URL = process.env.SITE_URL ?? "https://thecommunity-web--the-community-36766.europe-west4.hosted.app";

const plainSpaces = (s: string) => s.replace(/[  ]/g, " ");

/** « 169,00 DH » (montant en centimes), sans espaces insécables fines (absentes des polices PDF standard). */
export function money(cents: number, currency = "MAD"): string {
  const v = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, numberingSystem: "latn" }).format(cents / 100);
  return plainSpaces(`${v} ${currency === "MAD" ? "DH" : currency}`);
}

/** « 12 novembre 2026 » */
export function dateFr(d: Date): string {
  return plainSpaces(new Intl.DateTimeFormat("fr-FR", { timeZone: MOROCCO_TIMEZONE, day: "numeric", month: "long", year: "numeric" }).format(d));
}

/** « jeudi 12 novembre 2026 à 19h30 » */
export function dateTimeFr(d: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: MOROCCO_TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: MOROCCO_TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d).replace(":", "h");
  return plainSpaces(`${day} à ${time}`);
}

/** « Thursday 12 November 2026, 19:30 » / « الخميس 12 نونبر 2026، 19:30 » */
export function dateTimeFor(d: Date, locale: string): string {
  if (locale === "fr") return dateTimeFr(d);
  const intl = locale === "ar" ? "ar-MA" : "en-GB";
  return plainSpaces(new Intl.DateTimeFormat(intl, { timeZone: MOROCCO_TIMEZONE, numberingSystem: "latn", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d));
}
