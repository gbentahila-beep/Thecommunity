import { DEFAULT_EVENT_TEMPLATES, formatMoney, MOROCCO_TIMEZONE, zonedDateTimeToUtc, zonedParts } from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { getUpcomingSessions } from "@/lib/data";
import { formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

const DAY = 86_400_000;

/** Lundi 0 h (heure de Casablanca) de la semaine de `d`. */
function weekStart(d: Date): number {
  const z = zonedParts(d, MOROCCO_TIMEZONE);
  const back = (z.weekday + 6) % 7;
  const m = new Date(Date.UTC(z.year, z.month - 1, z.day - back));
  return zonedDateTimeToUtc({ year: m.getUTCFullYear(), month: m.getUTCMonth() + 1, day: m.getUTCDate(), hour: 0, minute: 0 }, MOROCCO_TIMEZONE).getTime();
}

/**
 * Agenda de l'accueil (docs/22 § 14) : Cette semaine / Semaine prochaine / Dans 2 semaines. Chaque ligne : icône de
 * l'univers, date en gras, format (et gamme), heure, prix à droite. Ni lieu ni quartier pour les lieux secrets.
 */
export async function Agenda({ cityId = DEFAULT_CITY, perWeek = 6 }: { cityId?: string; perWeek?: number }) {
  const [t, locale, sessions] = await Promise.all([getTranslations("agenda"), getLocale(), getUpcomingSessions({ cityId })]);
  const now = new Date();
  const w0 = weekStart(now);
  const weeks = [0, 1, 2].map((i) => ({ i, from: w0 + i * 7 * DAY, to: w0 + (i + 1) * 7 * DAY }));
  const lang = locale as "fr" | "ar" | "en";
  const day = (iso: string) => new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { timeZone: MOROCCO_TIMEZONE, weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  const label = (e: (typeof sessions)[number]["experience"]) => {
    const format = DEFAULT_EVENT_TEMPLATES.find((x) => x.id === (e.templateId || e.subcategoryId))?.name;
    const tier = e.venueTier ? ` · ${e.venueTier.charAt(0).toUpperCase()}${e.venueTier.slice(1)}` : "";
    return `${locale === "fr" && format ? format : tr(e.title, locale)}${tier}`;
  };
  const blocks = weeks.map((w) => ({ ...w, rows: sessions.filter((s) => { const ts = new Date(s.startAt).getTime(); return ts >= Math.max(w.from, now.getTime()) && ts < w.to && s.status !== "cancelled"; }).slice(0, perWeek) }));
  if (blocks.every((b) => b.rows.length === 0)) return null;
  return (
    <section aria-labelledby="agenda-title" className="space-y-5" data-testid="home-agenda">
      <h2 id="agenda-title" className="section-title">{t("title")}</h2>
      {blocks.map((b) => b.rows.length > 0 && (
        <div key={b.i} data-testid="agenda-week">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{t(`week${b.i}` as "week0")}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
            {b.rows.map((s) => (
              <li key={s.id}>
                <Link href={`/experiences/${s.experience.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-cream" data-testid="agenda-row">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-900"><CategoryIcon category={s.experience.categoryId} className="size-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold capitalize text-ink">{day(s.startAt)}</span>
                    <span className="block truncate text-sm text-muted">{label(s.experience)} · {formatTime(s.startAt, locale)}</span>
                  </span>
                  <span className="shrink-0 text-end font-semibold tabular-nums text-ink">{s.status === "full" ? <span className="text-sm text-muted">{t("full")}</span> : s.price.amount === 0 ? t("free") : formatMoney(s.price, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Link href={`/${cityId}`} className="inline-flex text-sm font-semibold text-brand-900 underline underline-offset-4">{t("seeAll")}</Link>
    </section>
  );
}
