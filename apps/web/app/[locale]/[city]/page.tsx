import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/category-chips";
import { ExperienceCard } from "@/components/experience-card";
import { PageShell, PrimaryLink, SectionHeading } from "@/components/ui";
import { routing } from "@/i18n/routing";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { getCategories, getCities, getCity, getNextSessionPerExperience } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export const revalidate = 3600;

export async function generateStaticParams() {
  if (FIREBASE_ENABLED) return []; // mode Firebase : pages rendues à la visite
  const cities = await getCities();
  return routing.locales.flatMap((locale) => cities.map((c) => ({ locale, city: c.id })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/[city]">): Promise<Metadata> {
  const { locale, city: cityId } = await params;
  const city = await getCity(cityId);
  if (!city) return {};
  const t = await getTranslations({ locale, namespace: "city" });
  const name = tr(city.name, locale);
  return {
    title: t("title", { city: name }),
    description: t("subtitle", { city: name }),
    alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/${city.id}` },
    robots: city.isActive ? undefined : { index: false },
  };
}

export default async function CityPage({ params }: PageProps<"/[locale]/[city]">) {
  const { locale, city: cityId } = await params;
  setRequestLocale(locale);
  const city = await getCity(cityId);
  if (!city) notFound();
  const [t, tHome] = await Promise.all([getTranslations("city"), getTranslations("home")]);
  const name = tr(city.name, locale);

  if (!city.isActive) {
    return (
      <PageShell className="py-24 text-center">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{t("comingSoonTitle", { city: name })}</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">{t("comingSoonText")}</p>
        <PrimaryLink href="/casablanca" className="mt-8">
          {t("backToCasablanca")}
        </PrimaryLink>
      </PageShell>
    );
  }

  const categories = await getCategories();
  const sections = await Promise.all(
    categories.map(async (c) => ({ category: c, sessions: await getNextSessionPerExperience({ cityId: city.id, categoryId: c.id, limit: 4 }) })),
  );

  return (
    <PageShell className="space-y-12 py-10">
      <header className="space-y-5">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{t("title", { city: name })}</h1>
        <p className="max-w-2xl text-lg text-ink/80">{t("subtitle", { city: name })}</p>
        <CategoryChips hrefFor={(id) => (id ? `/${city.id}/${id}` : `/${city.id}`)} />
      </header>
      {sections
        .filter((s) => s.sessions.length > 0)
        .map(({ category, sessions }) => (
          <section key={category.id} className="space-y-6">
            <SectionHeading
              title={tr(category.name, locale)}
              action={{ href: `/${city.id}/${category.id}`, label: tHome("seeAll") }}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sessions.map((s) => (
                <ExperienceCard key={s.id} session={s} experience={s.experience} />
              ))}
            </div>
          </section>
        ))}
    </PageShell>
  );
}
