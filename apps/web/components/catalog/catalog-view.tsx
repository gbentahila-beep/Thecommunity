import { activeFilterCount, VENUE_TIERS, CATALOG_FORMATS, CATALOG_SORTS, catalogParams, DAY_MOMENTS, formatParam, momentParam, MOROCCO_TIMEZONE, parseCatalogParams, sortParam, zonedParts, type CatalogFilters } from "@thecommunity/shared";
import { X } from "lucide-react";
import type { Category } from "@thecommunity/shared";
import { getTranslations } from "next-intl/server";
import { FiltersPanel } from "@/components/catalog-filters";
import { CityMenu } from "@/components/city-menu";
import { CategoryIcon } from "@/components/category-icon";
import { ExperienceRow } from "@/components/experience-row";
import { ActiveTabScroller } from "./active-tab-scroller";
import { ForYou } from "@/components/for-you";
import { PageShell, SectionHeading } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCatalog, getCategories, getPublishedExperiences, getSubcategories, type WhenFilter } from "@/lib/data";
import { dayKey, formatDayCell, formatDayHeading, formatLongDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

const WHEN_VALUES: WhenFilter[] = ["all", "today", "weekend", "week"];

type State = { category?: string; sub?: string; when: WhenFilter; filters: CatalogFilters };

/** Page d'un état : un univers (ou sous-univers) a sa propre adresse (/casablanca/jeux), sinon /experiences. */
const pathOf = (s: Pick<State, "category" | "sub">) => (s.category ? `/${DEFAULT_CITY}/${s.sub ?? s.category}` : "/experiences");

/** Adresse du catalogue avec l'état courant modifié (univers, période, filtres, tri). Changer d'univers retire le sous-univers. */
function hrefOf(s: State, change: Omit<Partial<State>, "filters"> & { filters?: Partial<CatalogFilters> } = {}) {
  const next = { ...s, ...("category" in change ? { sub: undefined } : {}), ...change, filters: { ...s.filters, ...(change.filters ?? {}) } };
  const q = new URLSearchParams();
  if (next.when !== "all") q.set("quand", next.when);
  for (const [k, v] of catalogParams(next.filters)) q.set(k, v);
  const str = q.toString();
  return `${pathOf(next)}${str ? `?${str}` : ""}`;
}

/**
 * Catalogue en vue « agenda » (onglets d'univers, calendrier, liste par jour), commun à « Toutes les expériences »
 * (/experiences), à la ville (/casablanca) et à chaque univers (/casablanca/jeux, sous-univers /casablanca/padel).
 */
export async function CatalogView({ locale, sp, routeCategory }: { locale: string; sp: Record<string, string | string[] | undefined>; routeCategory?: Category }) {
  const allCategories = await getCategories();
  // Univers : celui de l'adresse, sinon ?categorie= (ancien lien) ; une valeur inconnue est ignorée.
  const rawCategory = typeof sp.categorie === "string" ? sp.categorie : undefined;
  const fromRoute = routeCategory ? (routeCategory.parentId || routeCategory.id) : undefined;
  const category = fromRoute ?? (rawCategory && allCategories.some((c) => c.id === rawCategory) ? rawCategory : undefined);
  const sub = routeCategory?.parentId ? routeCategory.id : undefined;
  const rawWhen = typeof sp.quand === "string" ? sp.quand : "all";
  const filters = parseCatalogParams(sp);
  // Un jour précis remplace « quand ».
  const when = filters.date ? "all" : WHEN_VALUES.includes(rawWhen as WhenFilter) ? (rawWhen as WhenFilter) : "all";
  const state: State = { category, sub, when, filters };
  const bySub = <T extends { experience: { subcategoryId?: string | null } }>(xs: T[]) => (sub ? xs.filter((x) => x.experience.subcategoryId === sub) : xs);

  const [t, tc, tcity, tf, rawResults, , subcategories] = await Promise.all([
    getTranslations("filters"),
    getTranslations("catalog"),
    getTranslations("city"),
    getTranslations("catalogFilters"),
    getCatalog({ cityId: DEFAULT_CITY, categoryId: category, when, filters }),
    getPublishedExperiences(),
    category ? getSubcategories(category) : Promise.resolve([]),
  ]);
  const categories = allCategories;
  const results = { dated: bySub(rawResults.dated), undated: bySub(rawResults.undated) };
  const current = category ? allCategories.find((c) => c.id === category) ?? routeCategory : undefined;
  // Calendrier : les jours qui ont des dates, avec les filtres en cours mais sans le jour choisi.
  const forDays = filters.date ? { dated: bySub((await getCatalog({ cityId: DEFAULT_CITY, categoryId: category, when, filters: { ...filters, date: null } })).dated) } : results;
  const whenLabels: Record<WhenFilter, string> = { all: t("whenAll"), today: t("today"), weekend: t("weekend"), week: t("week") };
  const sortLabels = Object.fromEntries(CATALOG_SORTS.map((s) => [s, tf(`sort_${s}`)]));
  const n = activeFilterCount(filters);
  const p = zonedParts(new Date(), MOROCCO_TIMEZONE);
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const prefix = locale === "fr" ? "" : `/${locale}`;
  const select = "w-full rounded-2xl border border-line bg-white px-4 py-3 text-[16px] text-ink";

  // Filtres actifs, retirables un par un.
  const chips: { label: string; href: string }[] = [
    ...(filters.q ? [{ label: `« ${filters.q} »`, href: hrefOf(state, { filters: { q: "" } }) }] : []),
    ...(when !== "all" ? [{ label: whenLabels[when], href: hrefOf(state, { when: "all" }) }] : []),
    ...(filters.moment ? [{ label: tf(`moment_${filters.moment}`), href: hrefOf(state, { filters: { moment: null } }) }] : []),
    ...(filters.date ? [{ label: formatLongDate(`${filters.date}T12:00:00Z`, locale), href: hrefOf(state, { filters: { date: null } }) }] : []),
    ...(filters.format ? [{ label: tf(`format_${filters.format}`), href: hrefOf(state, { filters: { format: null } }) }] : []),
    ...(filters.tier ? [{ label: tf(`tier_${filters.tier}`), href: hrefOf(state, { filters: { tier: null } }) }] : []),
    ...(filters.beginner ? [{ label: tf("beginner"), href: hrefOf(state, { filters: { beginner: false } }) }] : []),
    ...(filters.available ? [{ label: tf("available"), href: hrefOf(state, { filters: { available: false } }) }] : []),
    ...(filters.women ? [{ label: tf("women"), href: hrefOf(state, { filters: { women: false } }) }] : []),
  ];
  const clearHref = hrefOf({ category, sub, when: "all", filters: { ...parseCatalogParams({}), sort: filters.sort } });
  const shownCategory = sub ? routeCategory : current;
  const total = results.dated.length;
  // Vue « agenda » (regroupée par jour) pour le tri par défaut ou par date ; liste simple pour les autres tris.
  const agenda = filters.sort === "recommended" || filters.sort === "date";
  const days: { key: string; items: typeof results.dated }[] = [];
  for (const x of [...results.dated].sort((a, b) => a.session!.startAt.localeCompare(b.session!.startAt))) {
    const key = dayKey(x.session!.startAt);
    const last = days[days.length - 1];
    if (last?.key === key) last.items.push(x);
    else days.push({ key, items: [x] });
  }
  // Calendrier : d'aujourd'hui au dernier jour qui a une date (14 jours au moins, 60 au plus).
  const counts = new Map<string, number>();
  for (const x of forDays.dated) counts.set(dayKey(x.session!.startAt), (counts.get(dayKey(x.session!.startAt)) ?? 0) + 1);
  const lastKey = [...counts.keys()].sort().pop() ?? today;
  const calendar: { key: string; count: number }[] = [];
  for (let i = 0; i < 60; i++) {
    const key = dayKey(new Date(Date.parse(`${today}T12:00:00Z`) + i * 86_400_000));
    if (i >= 14 && key > lastKey) break;
    calendar.push({ key, count: counts.get(key) ?? 0 });
  }

  return (
    <PageShell className="space-y-5 py-6 sm:py-10">
      <form action={`${prefix}${pathOf(state)}`} method="get" className="flex items-center justify-between gap-3" data-testid="catalog-form">
        <SectionHeading as="h1" title={filters.q ? tf("resultsFor", { q: filters.q }) : shownCategory ? tr(shownCategory.name, locale) : tc("discover")} />
        {when !== "all" && <input type="hidden" name="quand" value={when} />}
        {filters.q && <input type="hidden" name="q" value={filters.q} />}
        <div className="flex shrink-0 items-center gap-1">
          <CityMenu variant="label" />
          <FiltersPanel
            count={n}
            clearHref={clearHref}
            labels={{ open: tf("open"), title: tf("title"), apply: tf("apply"), clear: tf("clear"), close: tf("close") }}
          >
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-ink">{tf("sort")}</span>
                <select name="tri" defaultValue={sortParam(filters.sort)} className={select}>
                  {CATALOG_SORTS.filter((s) => !s.startsWith("price")).map((s) => <option key={s} value={sortParam(s)}>{sortLabels[s]}</option>)}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">{tf("moment")}</span>
                  <select name="moment" defaultValue={filters.moment ? momentParam(filters.moment) : ""} className={select}>
                    <option value="">{tf("momentAny")}</option>
                    {DAY_MOMENTS.map((m) => <option key={m} value={momentParam(m)}>{tf(`moment_${m}`)}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">{tf("date")}</span>
                  <input type="date" name="date" min={today} defaultValue={filters.date ?? ""} className={select} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">{tf("tier")}</span>
                  <select name="gamme" defaultValue={filters.tier ?? ""} className={select}>
                    <option value="">{tf("tierAny")}</option>
                    {VENUE_TIERS.map((v) => <option key={v} value={v}>{tf(`tier_${v}`)}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-ink">{tf("format")}</span>
                  <select name="format" defaultValue={filters.format ? formatParam(filters.format) : ""} className={select}>
                    <option value="">{tf("formatAny")}</option>
                    {CATALOG_FORMATS.map((f) => <option key={f} value={formatParam(f)}>{tf(`format_${f}`)}</option>)}
                  </select>
                </label>
              </div>
              <div className="space-y-3 pt-1">
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" name="debutant" value="1" defaultChecked={filters.beginner} className="size-4 accent-brand-900" />
                  {tf("beginner")}
                </label>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" name="dispo" value="1" defaultChecked={filters.available} className="size-4 accent-brand-900" />
                  {tf("available")}
                </label>
                <label className="flex items-center gap-2.5 text-sm text-ink">
                  <input type="checkbox" name="public" value="femmes" defaultChecked={filters.women} className="size-4 accent-brand-900" />
                  {tf("women")}
                </label>
              </div>
            </div>
          </FiltersPanel>
        </div>
      </form>

      <nav aria-label={tc("tabsLabel")} className="-mx-4 border-b border-line sm:mx-0" data-testid="catalog-tabs">
        <ActiveTabScroller className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-0">
          {[{ id: undefined as string | undefined, label: t("all"), icon: undefined as string | undefined }, ...categories.map((c) => ({ id: c.id, label: tr(c.shortName, locale), icon: c.icon }))].map((it) => {
            const on = it.id === category;
            return (
              <li key={it.id ?? "all"} className="shrink-0">
                <Link
                  href={hrefOf(state, { category: it.id })}
                  aria-current={on ? "page" : undefined}
                  className={`relative flex items-center gap-2 px-3 pt-2 pb-3 text-[15px] transition after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full ${on ? "font-semibold text-ink after:bg-brand-700" : "text-muted hover:text-ink after:bg-transparent"}`}
                >
                  {it.id && <CategoryIcon category={it.id} icon={it.icon} className="size-4" />}
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ActiveTabScroller>
      </nav>

      {subcategories.length > 0 && (
        <nav aria-label={tcity("subcategories")}>
          <ul className="flex flex-wrap gap-2">
            {[{ id: undefined as string | undefined, label: t("all") }, ...subcategories.map((c) => ({ id: c.id as string | undefined, label: tr(c.shortName, locale) }))].map((it) => (
              <li key={it.id ?? "all"}>
                <Link
                  href={hrefOf(state, { sub: it.id })}
                  aria-current={it.id === sub ? "page" : undefined}
                  data-testid="subcategory-chip"
                  className={`inline-block rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${it.id === sub ? "bg-brand-100 text-brand-900" : "bg-white/60 text-ink/80 hover:bg-white"}`}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label={tf("active")} data-testid="active-filters">
          {chips.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-900 hover:bg-brand-100" aria-label={tf("remove", { label: c.label })}>
                {c.label}
                <X className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link href={clearHref} className="text-sm font-semibold text-brand-900 underline underline-offset-4">{tf("clear")}</Link>
          </li>
        </ul>
      )}

      {total > 0 && (
        <nav aria-label={tc("calendarLabel")} className="sticky top-[4.5rem] z-20 -mx-4 bg-cream/95 px-4 py-2 backdrop-blur-sm sm:mx-auto sm:max-w-4xl sm:rounded-2xl sm:px-0 lg:top-20" data-testid="catalog-calendar">
          <ul className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {calendar.map((d) => {
              const cell = formatDayCell(`${d.key}T12:00:00Z`, locale);
              const inner = (
                <>
                  <span className="text-[11px] font-semibold tracking-wide uppercase">{cell.weekday}</span>
                  <span className="text-xl leading-none font-semibold">{cell.day}</span>
                  <span className={`size-1.5 rounded-full ${d.count ? "bg-brand-700" : "bg-transparent"}`} aria-hidden />
                </>
              );
              const base = "flex w-12 flex-col items-center gap-1 rounded-2xl py-2";
              return (
                <li key={d.key} className="shrink-0">
                  {d.count ? (
                    <a
                      href={filters.date ? `${prefix}${hrefOf(state, { filters: { date: d.key } })}` : `#jour-${d.key}`}
                      aria-current={filters.date === d.key ? "date" : undefined}
                      aria-label={`${formatLongDate(`${d.key}T12:00:00Z`, locale)} : ${t("results", { count: d.count })}`}
                      className={`${base} ${filters.date === d.key ? "bg-brand-900 text-white" : "text-ink hover:bg-white"}`}
                    >
                      {inner}
                    </a>
                  ) : (
                    <span className={`${base} text-ink/30`} aria-hidden>{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {total > 0 ? (
        <div className="mx-auto max-w-4xl space-y-8" data-testid="catalog-results">
          {agenda ? (
            days.map((d, di) => {
              const h = formatDayHeading(d.items[0]!.session!.startAt, locale);
              return (
                <section key={d.key} id={`jour-${d.key}`} aria-labelledby={`jour-${d.key}-title`} className="scroll-mt-44">
                  <h2 id={`jour-${d.key}-title`} className="flex items-baseline gap-2.5">
                    <span className="font-display text-2xl font-medium text-ink sm:text-[1.75rem]">{h.weekday}</span>
                    <span className="text-[15px] text-muted">{h.date}</span>
                  </h2>
                  <div className="divide-y divide-line">
                    {d.items.map((x, i) => (
                      <ExperienceRow key={x.session!.id} session={x.session!} experience={x.experience} priority={di === 0 && i < 3} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="divide-y divide-line">
              {results.dated.map((x, i) => (
                <ExperienceRow key={x.session!.id} session={x.session!} experience={x.experience} showDay priority={i < 3} />
              ))}
            </div>
          )}
        </div>
      ) : results.undated.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-16 text-center" data-testid="catalog-empty">
          <p className="text-muted">{filters.q ? tf("emptySearch", { q: filters.q }) : t("empty")}</p>
          <Link href="/experiences" className="mt-4 inline-block font-semibold text-brand-900 underline underline-offset-4">
            {t("reset")}
          </Link>
        </div>
      ) : null}
      {!filters.q && n === 0 && !category && <ForYou />}
      {results.undated.length > 0 && (
        <section aria-labelledby="undated-title" className="mx-auto max-w-4xl space-y-4 pt-6">
          <div>
            <h2 id="undated-title" className="section-title">{tc("undatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{tc("undatedText")}</p>
          </div>
          <div className="divide-y divide-line" data-testid="undated-list">
            {results.undated.map((x) => (
              <ExperienceRow key={x.experience.id} experience={x.experience} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
