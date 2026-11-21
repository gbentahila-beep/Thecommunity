import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/catalog/catalog-view";
import { PageShell, PrimaryLink } from "@/components/ui";
import { getCity } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

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

export default async function CityPage({ params, searchParams }: PageProps<"/[locale]/[city]">) {
  const { locale, city: cityId } = await params;
  setRequestLocale(locale);
  const city = await getCity(cityId);
  if (!city) notFound();
  const t = await getTranslations("city");
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

  // Ville ouverte : le planning de toutes ses expériences.
  return <CatalogView locale={locale} sp={await searchParams} />;
}
