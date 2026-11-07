import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpHub } from "@/components/help/help-hub";

export async function generateMetadata({ params }: PageProps<"/[locale]/aide/partenaires">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: `${t("title")} · ${t("tabPartners")}`, description: t("partnerText") };
}

export default async function HelpPartnersPage({ params }: PageProps<"/[locale]/aide/partenaires">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HelpHub audience="partners" locale={locale} />;
}
