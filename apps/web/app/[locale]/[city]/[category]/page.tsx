import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/category-chips";
import { ExperienceCard } from "@/components/experience-card";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { getAllCategories, getCategory, getCities, getCity, getNextSessionPerExperience, getSubcategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (FIREBASE_ENABLED) return []; // mode Firebase : pages rendues à la visite
  const [cities, categories] = await Promise.all([getCities(), getAllCategories()]);
  return routing.locales.flatMap((locale) =>
    cities.filter((c) => c.isActive).flatMap((c) => categories.map((category) => ({ locale, city: c.id, category: category.id }))),
  );
}

async function load(cityId: string, categoryId: string) {
  const [city, category] = await Promise.all([getCity(cityId), getCategory(categoryId)]);
  return city?.isActive && category ? { city, category } : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[city]/[category]">): Promise<Metadata> {
  const { locale, city: cityId, category: categoryId } = await params;
  const data = await load(cityId, categoryId);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "city" });
  return {
    title: t("categoryTitle", { category: tr(data.category.name, locale), city: tr(data.city.name, locale) }),
    description: tr(data.category.description, locale),
    alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/${cityId}/${categoryId}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/[city]/[category]">) {
  const { locale: localeParam, city: cityId, category: categoryId } = await params;
  setRequestLocale(localeParam);
  const data = await load(cityId, categoryId);
  if (!data) notFound();
  const { city, category } = data;
  // Étape 19 : une sous-catégorie (/casablanca/padel) liste les activités de sa catégorie principale qui la portent.
  const mainId = category.parentId || category.id;
  const [t, tf, locale, sessions, subcategories] = await Promise.all([
    getTranslations("city"),
    getTranslations("filters"),
    getLocale(),
    getNextSessionPerExperience({ cityId: city.id, categoryId: mainId, ...(category.parentId ? { subcategoryId: category.id } : {}) }),
    getSubcategories(mainId),
  ]);

  return (
    <PageShell className="space-y-8 py-10">
      <header className="space-y-4">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">
          {t("categoryTitle", { category: tr(category.name, locale), city: tr(city.name, locale) })}
        </h1>
        <p className="max-w-2xl text-lg text-ink/80">{tr(category.description, locale)}</p>
      </header>
      <CategoryChips active={mainId} hrefFor={(id) => (id ? `/${city.id}/${id}` : `/${city.id}`)} />
      {subcategories.length > 0 && (
        <nav aria-label={t("subcategories")}>
          <ul className="flex flex-wrap gap-2">
            {[{ id: mainId, label: tf("all") }, ...subcategories.map((c) => ({ id: c.id, label: tr(c.shortName, locale) }))].map((it) => (
              <li key={it.id}>
                <Link
                  href={`/${city.id}/${it.id}`}
                  aria-current={it.id === category.id ? "page" : undefined}
                  data-testid="subcategory-chip"
                  className={`inline-block rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${it.id === category.id ? "bg-plum-100 text-plum-900" : "bg-white/60 text-ink/80 hover:bg-white"}`}
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="text-sm text-muted">{tf("results", { count: sessions.length })}</p>
      {sessions.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sessions.map((s, i) => (
            <ExperienceCard key={s.id} session={s} experience={s.experience} priority={i < 2} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-16 text-center text-muted">
          {tf("empty")}{" "}
          <Link href={`/${city.id}`} className="font-semibold text-plum-900 underline underline-offset-4">
            {tf("reset")}
          </Link>
        </div>
      )}
    </PageShell>
  );
}
