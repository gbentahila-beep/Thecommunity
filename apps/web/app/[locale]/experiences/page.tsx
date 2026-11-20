import { activeFilterCount, CATALOG_FORMATS, CATALOG_MAX_PRICES, CATALOG_SORTS, catalogDistricts, catalogParams, formatParam, MOROCCO_TIMEZONE, parseCatalogParams, sortParam, zonedParts, type CatalogFilters } from "@thecommunity/shared";
import { X } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AutoSubmitSelect, FiltersPanel } from "@/components/catalog-filters";
import { CategoryChips } from "@/components/category-chips";
import { ExperienceCard } from "@/components/experience-card";
import { PageShell, SectionHeading } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCatalog, getCategories, getPublishedExperiences, type WhenFilter } from "@/lib/data";
import { formatLongDate } from "@/lib/format";
import { DEFAULT_CITY } from "@/lib/site";

const WHEN_VALUES: WhenFilter[] = ["all", "today", "weekend", "week"];

export async function generateMetadata({ params, searchParams }: PageProps<"/[locale]/experiences">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  const sp = await searchParams;
  // Les pages filtrées ne sont pas indexées (contenu en double) ; la page catalogue l'est.
  const filtered = Object.keys(sp).some((k) => !["categorie"].includes(k));
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: locale === "fr" ? "/experiences" : `/${locale}/experiences` },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

type State = { category?: string; when: WhenFilter; filters: CatalogFilters };

/** Adresse du catalogue avec l'état courant modifié (catégorie, période, filtres, tri). */
function hrefOf(s: State, change: Omit<Partial<State>, "filters"> & { filters?: Partial<CatalogFilters> } = {}) {
  const next = { ...s, ...change, filters: { ...s.filters, ...(change.filters ?? {}) } };
  const q = new URLSearchParams();
  if (next.category) q.set("categorie", next.category);
  if (next.when !== "all") q.set("quand", next.when);
  for (const [k, v] of catalogParams(next.filters)) q.set(k, v);
  const str = q.toString();
  return `/experiences${str ? `?${str}` : ""}`;
}

export default async function CatalogPage({ params, searchParams }: PageProps<"/[locale]/experiences">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const rawCategory = typeof sp.categorie === "string" ? sp.categorie : undefined;
  // Étape 19 : catégories dynamiques (une valeur inconnue est ignorée).
  const category = rawCategory && (await getCategories()).some((c) => c.id === rawCategory) ? rawCategory : undefined;
  const rawWhen = typeof sp.quand === "string" ? sp.quand : "all";
  const filters = parseCatalogParams(sp);
  // Un jour précis remplace « quand ».
  const when = filters.date ? "all" : WHEN_VALUES.includes(rawWhen as WhenFilter) ? (rawWhen as WhenFilter) : "all";
  const state: State = { category, when, filters };

  const [t, tc, tf, results, published] = await Promise.all([
    getTranslations("filters"),
    getTranslations("catalog"),
    getTranslations("catalogFilters"),
    getCatalog({ cityId: DEFAULT_CITY, categoryId: category, when, filters }),
    getPublishedExperiences(),
  ]);
  const districts = catalogDistricts(published.filter((e) => e.cityId === DEFAULT_CITY));
  const whenLabels: Record<WhenFilter, string> = { all: t("whenAll"), today: t("today"), weekend: t("weekend"), week: t("week") };
  const sortLabels = Object.fromEntries(CATALOG_SORTS.map((s) => [s, tf(`sort_${s}`)]));
  const n = activeFilterCount(filters);
  const p = zonedParts(new Date(), MOROCCO_TIMEZONE);
  const today = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const prefix = locale === "fr" ? "" : `/${locale}`;
  const select = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink";

  // Filtres actifs, retirables un par un.
  const chips: { label: string; href: string }[] = [
    ...(filters.q ? [{ label: `« ${filters.q} »`, href: hrefOf(state, { filters: { q: "" } }) }] : []),
    ...(filters.maxPrice ? [{ label: tf("priceMax", { amount: filters.maxPrice }), href: hrefOf(state, { filters: { maxPrice: null } }) }] : []),
    ...(filters.district ? [{ label: filters.district, href: hrefOf(state, { filters: { district: null } }) }] : []),
    ...(filters.date ? [{ label: formatLongDate(`${filters.date}T12:00:00Z`, locale), href: hrefOf(state, { filters: { date: null } }) }] : []),
    ...(filters.format ? [{ label: tf(`format_${filters.format}`), href: hrefOf(state, { filters: { format: null } }) }] : []),
    ...(filters.beginner ? [{ label: tf("beginner"), href: hrefOf(state, { filters: { beginner: false } }) }] : []),
    ...(filters.available ? [{ label: tf("available"), href: hrefOf(state, { filters: { available: false } }) }] : []),
    ...(filters.women ? [{ label: tf("women"), href: hrefOf(state, { filters: { women: false } }) }] : []),
  ];
  const clearHref = hrefOf({ category, when: "all", filters: { ...parseCatalogParams({}), sort: filters.sort } });
  const total = results.dated.length;

  return (
    <PageShell className="space-y-6 py-10">
      <div>
        <SectionHeading as="h1" title={filters.q ? tf("resultsFor", { q: filters.q }) : tc("title")} />
        <p className="mt-2 text-muted">{tc("subtitle")}</p>
      </div>

      <form action={`${prefix}/experiences`} method="get" className="space-y-5" data-testid="catalog-form">
        {category && <input type="hidden" name="categorie" value={category} />}
        {when !== "all" && <input type="hidden" name="quand" value={when} />}
        <div role="search" className="flex gap-2">
          <label htmlFor="catalog-q" className="sr-only">{tf("searchLabel")}</label>
          <input
            id="catalog-q"
            type="search"
            name="q"
            defaultValue={filters.q}
            maxLength={80}
            placeholder={tf("searchPlaceholder")}
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-base shadow-card placeholder:text-ink/45 focus:border-plum-700 focus:outline-none focus:ring-2 focus:ring-plum-200"
          />
          <button type="submit" className="shrink-0 rounded-full bg-plum-900 px-5 py-3 text-sm font-semibold text-white">{tf("searchButton")}</button>
        </div>

        <CategoryChips active={category} hrefFor={(id) => hrefOf(state, { category: id })} />
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("when")}>
          {WHEN_VALUES.map((w) => (
            <Link
              key={w}
              href={hrefOf(state, { when: w, filters: { date: null } })}
              aria-current={w === when && !filters.date ? "true" : undefined}
              className={`rounded-full px-3.5 py-1.5 text-sm transition ${w === when && !filters.date ? "bg-plum-100 font-semibold text-plum-900" : "text-muted hover:bg-cream-deep"}`}
            >
              {whenLabels[w]}
            </Link>
          ))}
        </div>

        <FiltersPanel
          count={n}
          clearHref={clearHref}
          labels={{ open: tf("open"), title: tf("title"), apply: tf("apply"), clear: tf("clear"), close: tf("close") }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end lg:gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">{tf("price")}</span>
              <select name="prix" defaultValue={filters.maxPrice ?? ""} className={select}>
                <option value="">{tf("priceAny")}</option>
                {CATALOG_MAX_PRICES.map((v) => <option key={v} value={v}>{tf("priceMax", { amount: v })}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">{tf("district")}</span>
              <select name="quartier" defaultValue={filters.district ?? ""} className={select}>
                <option value="">{tf("districtAny")}</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">{tf("date")}</span>
              <input type="date" name="date" min={today} defaultValue={filters.date ?? ""} className={select} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">{tf("format")}</span>
              <select name="format" defaultValue={filters.format ? formatParam(filters.format) : ""} className={select}>
                <option value="">{tf("formatAny")}</option>
                {CATALOG_FORMATS.map((f) => <option key={f} value={formatParam(f)}>{tf(`format_${f}`)}</option>)}
              </select>
            </label>
            <button type="submit" className="hidden rounded-full bg-plum-900 px-5 py-2.5 text-sm font-semibold text-white lg:block">{tf("applyShort")}</button>
            <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-5">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="debutant" value="1" defaultChecked={filters.beginner} className="size-4 accent-plum-900" />
                {tf("beginner")}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="dispo" value="1" defaultChecked={filters.available} className="size-4 accent-plum-900" />
                {tf("available")}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" name="public" value="femmes" defaultChecked={filters.women} className="size-4 accent-plum-900" />
                {tf("women")}
              </label>
            </div>
          </div>
        </FiltersPanel>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite" data-testid="catalog-count">{t("results", { count: total })}</p>
          <label className="inline-flex items-center gap-2 text-sm">
            <span className="text-muted">{tf("sort")}</span>
            <AutoSubmitSelect name="tri" defaultValue={sortParam(filters.sort)} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink" aria-label={tf("sort")}>
              {CATALOG_SORTS.map((s) => <option key={s} value={sortParam(s)}>{sortLabels[s]}</option>)}
            </AutoSubmitSelect>
          </label>
        </div>
      </form>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-2" aria-label={tf("active")} data-testid="active-filters">
          {chips.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="inline-flex items-center gap-1.5 rounded-full bg-plum-50 px-3 py-1.5 text-sm font-medium text-plum-900 hover:bg-plum-100" aria-label={tf("remove", { label: c.label })}>
                {c.label}
                <X className="size-3.5" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <Link href={clearHref} className="text-sm font-semibold text-plum-900 underline underline-offset-4">{tf("clear")}</Link>
          </li>
        </ul>
      )}

      {total > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" data-testid="catalog-results">
          {results.dated.map((x, i) => (
            <ExperienceCard key={x.session!.id} session={x.session!} experience={x.experience} priority={i < 2} />
          ))}
        </div>
      ) : results.undated.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-16 text-center" data-testid="catalog-empty">
          <p className="text-muted">{filters.q ? tf("emptySearch", { q: filters.q }) : t("empty")}</p>
          <Link href="/experiences" className="mt-4 inline-block font-semibold text-plum-900 underline underline-offset-4">
            {t("reset")}
          </Link>
        </div>
      ) : null}
      {results.undated.length > 0 && (
        <section aria-labelledby="undated-title" className="space-y-4 pt-6">
          <div>
            <h2 id="undated-title" className="font-display text-2xl font-medium text-plum-900">{tc("undatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{tc("undatedText")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.undated.map((x) => (
              <ExperienceCard key={x.experience.id} experience={x.experience} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
