import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpHub } from "@/components/help/help-hub";

export async function generateMetadata({ params }: PageProps<"/[locale]/aide">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: t("title"), description: t("heroText"), alternates: { canonical: locale === "fr" ? "/aide" : `/${locale}/aide` } };
}

export default async function HelpPage({ params }: PageProps<"/[locale]/aide">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HelpHub audience="clients" locale={locale} />;
}
