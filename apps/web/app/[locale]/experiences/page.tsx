import { CATEGORY_KEYS, type CategoryKey } from "@thecommunity/shared";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/category-chips";
import { ExperienceCard } from "@/components/experience-card";
import { PageShell, SectionHeading } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getExperiencesWithoutUpcoming, getNextSessionPerExperience, type WhenFilter } from "@/lib/data";
import { DEFAULT_CITY } from "@/lib/site";

const WHEN_VALUES: WhenFilter[] = ["all", "today", "weekend", "week"];

export async function generateMetadata({ params }: PageProps<"/[locale]/experiences">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: t("title"), description: t("subtitle"), alternates: { canonical: locale === "fr" ? "/experiences" : `/${locale}/experiences` } };
}

function buildHref(category?: string, when?: WhenFilter) {
  const q = new URLSearchParams();
  if (category) q.set("categorie", category);
  if (when && when !== "all") q.set("quand", when);
  const s = q.toString();
  return `/experiences${s ? `?${s}` : ""}`;
}

export default async function CatalogPage({ params, searchParams }: PageProps<"/[locale]/experiences">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const rawCategory = typeof sp.categorie === "string" ? sp.categorie : undefined;
  const category = CATEGORY_KEYS.includes(rawCategory as CategoryKey) ? (rawCategory as CategoryKey) : undefined;
  const rawWhen = typeof sp.quand === "string" ? sp.quand : "all";
  const when = WHEN_VALUES.includes(rawWhen as WhenFilter) ? (rawWhen as WhenFilter) : "all";

  const [t, tc, sessions, undated] = await Promise.all([
    getTranslations("filters"),
    getTranslations("catalog"),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY, categoryId: category, when }),
    when === "all" ? getExperiencesWithoutUpcoming({ cityId: DEFAULT_CITY, categoryId: category }) : Promise.resolve([]),
  ]);
  const whenLabels: Record<WhenFilter, string> = {
    all: t("whenAll"),
    today: t("today"),
    weekend: t("weekend"),
    week: t("week"),
  };

  return (
    <PageShell className="space-y-7 py-10">
      <div>
        <SectionHeading as="h1" title={tc("title")} />
        <p className="mt-2 text-muted">{tc("subtitle")}</p>
      </div>
      <CategoryChips active={category} hrefFor={(id) => buildHref(id, when)} />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("when")}>
        {WHEN_VALUES.map((w) => (
          <Link
            key={w}
            href={buildHref(category, w)}
            aria-current={w === when ? "true" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-sm transition ${
              w === when ? "bg-plum-100 font-semibold text-plum-900" : "text-muted hover:bg-cream-deep"
            }`}
          >
            {whenLabels[w]}
          </Link>
        ))}
        <span className="ms-auto text-sm text-muted" aria-live="polite">
          {t("results", { count: sessions.length })}
        </span>
      </div>
      {sessions.length === 0 && undated.length > 0 ? null : sessions.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((s, i) => (
            <ExperienceCard key={s.id} session={s} experience={s.experience} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-white/60 px-6 py-16 text-center">
          <p className="text-muted">{t("empty")}</p>
          <Link href="/experiences" className="mt-4 inline-block font-semibold text-plum-900 underline underline-offset-4">
            {t("reset")}
          </Link>
        </div>
      )}
      {undated.length > 0 && (
        <section aria-labelledby="undated-title" className="space-y-4 pt-6">
          <div>
            <h2 id="undated-title" className="font-display text-2xl font-medium text-plum-900">{tc("undatedTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{tc("undatedText")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {undated.map((e) => (
              <ExperienceCard key={e.id} experience={e} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
