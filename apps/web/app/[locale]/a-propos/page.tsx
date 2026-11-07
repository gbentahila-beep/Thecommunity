import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { PrimaryLink } from "@/components/ui";

export async function generateMetadata({ params }: PageProps<"/[locale]/a-propos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("aboutTitle"), description: t("aboutText") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/a-propos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th] = await Promise.all([getTranslations("pages"), getTranslations("home")]);
  return (
    <StaticPage title={t("aboutTitle")} intro={t("aboutText")}>
      <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
    </StaticPage>
  );
}
