import { MOROCCO_TIMEZONE } from "@thecommunity/shared";

const intlLocale = (locale: string) => (locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR");

function fmt(iso: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: MOROCCO_TIMEZONE,
    numberingSystem: "latn",
    ...options,
  }).format(new Date(iso));
}

/** « 19h30 » en français, « 19:30 » en arabe et en anglais. */
export function formatTime(iso: string, locale: string) {
  const t = fmt(iso, locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return locale === "fr" ? t.replace(":", "h") : t;
}

/** « Jeu. 19h30 » — format compact des cartes. */
export function formatShortSlot(iso: string, locale: string) {
  const day = fmt(iso, locale, { weekday: "short" });
  const label = locale === "fr" ? day.charAt(0).toUpperCase() + day.slice(1) : day;
  return `${label} ${formatTime(iso, locale)}`;
}

/** « Jeudi 7 novembre » */
export function formatLongDate(iso: string, locale: string) {
  const d = fmt(iso, locale, { weekday: "long", day: "numeric", month: "long" });
  return locale === "fr" ? d.charAt(0).toUpperCase() + d.slice(1) : d;
}

/** « 19h30 – 22h00 » */
export function formatTimeRange(startIso: string, endIso: string, locale: string) {
  return `${formatTime(startIso, locale)} – ${formatTime(endIso, locale)}`;
}

/** « 12 mai 1994 » — pour une date calendaire AAAA-MM-JJ (sans fuseau). */
export function formatCalendarDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: "UTC",
    numberingSystem: "latn",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** Jour calendaire à Casablanca, « AAAA-MM-JJ » (regroupement par jour du catalogue). */
export function dayKey(iso: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MOROCCO_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(typeof iso === "string" ? new Date(iso) : iso);
}

/** En-tête d'un jour du catalogue : « Samedi » et « 21 novembre ». */
export function formatDayHeading(iso: string, locale: string) {
  const weekday = fmt(iso, locale, { weekday: "long" });
  return { weekday: locale === "fr" ? weekday.charAt(0).toUpperCase() + weekday.slice(1) : weekday, date: fmt(iso, locale, { day: "numeric", month: "long" }) };
}

/** Case du calendrier : « SAM. » et « 21 ». */
export function formatDayCell(iso: string, locale: string) {
  return { weekday: fmt(iso, locale, { weekday: "short" }).replace(".", ""), day: fmt(iso, locale, { day: "numeric" }) };
}

/** « Sam. 21 nov. · 10h30 » — lignes compactes de l'accueil. */
export function formatDaySlot(iso: string, locale: string) {
  const d = fmt(iso, locale, { weekday: "short", day: "numeric", month: "short" });
  const label = locale === "fr" ? d.charAt(0).toUpperCase() + d.slice(1) : d;
  return `${label} · ${formatTime(iso, locale)}`;
}
