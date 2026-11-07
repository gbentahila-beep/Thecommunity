import { MOROCCO_TIMEZONE } from "@thecommunity/shared";

const intlLocale = (locale: string) => (locale === "ar" ? "ar-MA" : "fr-FR");

function fmt(iso: string, locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: MOROCCO_TIMEZONE,
    numberingSystem: "latn",
    ...options,
  }).format(new Date(iso));
}

/** « 19h30 » en français, « 19:30 » en arabe. */
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
