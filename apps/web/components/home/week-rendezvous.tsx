import { bookingClosesAt, bookingWindow, seatsAvailable } from "@thecommunity/shared";
import { CalendarDays, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getPublishedExperiences, getRendezvousList, getUpcomingSessions } from "@/lib/data";
import { formatLongDate, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

/** Nom du jour (0 = dimanche) dans la langue de la page. */
function weekdayName(weekday: number, locale: string) {
  const d = new Date(Date.UTC(2026, 10, 22 + weekday, 12));
  const s = new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { weekday: "long", timeZone: "UTC" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const lowerFirst = (s: string, locale: string) => (locale === "fr" ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * docs/25 — « Votre semaine Wenzy » : les rendez-vous de la communauté, un par jour (lundi → dimanche), avec l'état de
 * la date de la semaine (ouvert jusqu'à…, complet, ouvre bientôt). Rien tant qu'aucun rendez-vous n'est actif.
 */
export async function WeekRendezvous() {
  const list = await getRendezvousList();
  if (list.length === 0) return null;
  const [t, locale, published] = await Promise.all([getTranslations("home"), getLocale(), getPublishedExperiences()]);
  const byId = new Map(published.map((e) => [e.id, e]));
  const now = new Date();
  const rows = (
    await Promise.all(
      list.map(async (rv) => {
        // Lot D : l'activité du samedi — l'activité de la semaine (date ouverte de la rotation).
        if (rv.kind === "rotation") {
          const sessions = (await getUpcomingSessions({ rendezvousId: rv.id })).filter((s) => s.rendezvousId === rv.id);
          const any = sessions[0]?.experience;
          if (!any) return null;
          const w = bookingWindow(sessions, any, now, bookingClosesAt);
          const open = sessions.find((s) => w.get(s.id)?.state === "open");
          const shown = open ?? sessions[0]!;
          return {
            rv,
            slug: shown.experience.slug,
            first: open ? { slug: open.experience.slug, closesAt: bookingClosesAt(new Date(open.startAt), open.experience), startAt: open.startAt, left: seatsAvailable(open) } : undefined,
            full: Boolean(open) && seatsAvailable(open!) === 0,
            activity: { name: tr(shown.experience.title, locale), time: formatTime(shown.startAt, locale) },
          };
        }
        const opens: { slug: string; closesAt: Date; startAt: string; left: number }[] = [];
        let slug: string | null = null;
        for (const x of rv.tiers) {
          const e = byId.get(x.experienceId);
          if (!e) continue;
          slug ??= e.slug;
          const sessions = await getUpcomingSessions({ experienceId: e.id });
          const w = bookingWindow(sessions, e, now, bookingClosesAt);
          const open = sessions.find((s) => w.get(s.id)?.state === "open");
          if (open && x.frequency === "weekly") opens.push({ slug: e.slug, closesAt: bookingClosesAt(new Date(open.startAt), e), startAt: open.startAt, left: seatsAvailable(open) });
        }
        if (!slug) return null;
        const first = opens.sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
        const left = opens.reduce((n, o) => n + o.left, 0);
        return { rv, slug: first?.slug ?? slug, first, full: opens.length > 0 && left === 0, activity: null };
      }),
    )
  )
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    // Semaine du lundi au dimanche.
    .sort((a, b) => ((a.rv.weekday + 6) % 7) - ((b.rv.weekday + 6) % 7) || a.rv.time.localeCompare(b.rv.time));

  return (
    <PageShell className="mt-12 max-w-3xl lg:max-w-4xl" data-testid="week-rendezvous">
      <p className="eyebrow text-center">{t("weekRvEyebrow")}</p>
      <h2 className="section-title mt-2 text-center">{t("weekRvTitle")}</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-ink/75">{t("weekRvText")}</p>
      <ul className="event-list mt-6">
        {rows.map(({ rv, slug, first, full, activity }) => (
          <li key={rv.id}>
            <Link href={`/experiences/${slug}#dates`} className="flex items-center gap-4 px-4 py-4 hover:bg-cream/60">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-center">
                <span className="text-[11px] font-semibold tracking-wide text-brand-700 uppercase">{weekdayName(rv.weekday, locale).slice(0, 3)}</span>
                <CalendarDays className="size-4 text-brand-700" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{tr(rv.title as never, locale)}</span>
                <span className="block text-sm text-muted">
                  {activity
                    ? t("weekRvActivity", { day: weekdayName(rv.weekday, locale).toLowerCase(), name: activity.name, time: activity.time })
                    : t("weekRvWhen", { day: weekdayName(rv.weekday, locale), time: rv.time.replace(":", locale === "fr" ? "h" : ":") })}
                </span>
                <span className={`block text-xs font-semibold ${full ? "text-muted" : first ? "text-cat-move" : "text-brand-700"}`}>
                  {full ? t("weekRvFull") : first ? t("weekRvOpenUntil", { day: lowerFirst(formatLongDate(first.closesAt.toISOString(), locale), locale), time: formatTime(first.closesAt.toISOString(), locale) }) : t("weekRvSoon")}
                </span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-muted rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
