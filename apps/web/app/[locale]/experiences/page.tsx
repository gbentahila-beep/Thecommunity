import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView } from "@/components/catalog/catalog-view";

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

export default async function CatalogPage({ params, searchParams }: PageProps<"/[locale]/experiences">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CatalogView locale={locale} sp={await searchParams} />;
}
