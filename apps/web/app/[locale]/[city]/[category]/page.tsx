import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/catalog/catalog-view";
import { getCategory, getCity } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

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

/** Un univers (ou sous-univers) : le même planning que « Toutes les expériences », onglet de l'univers sélectionné. */
export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/[city]/[category]">) {
  const { locale, city: cityId, category: categoryId } = await params;
  setRequestLocale(locale);
  const data = await load(cityId, categoryId);
  if (!data) notFound();
  return <CatalogView locale={locale} sp={await searchParams} routeCategory={data.category} />;
}
