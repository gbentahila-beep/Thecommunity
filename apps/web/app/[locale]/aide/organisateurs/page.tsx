import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpHub } from "@/components/help/help-hub";

export async function generateMetadata({ params }: PageProps<"/[locale]/aide/organisateurs">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "help" });
  return { title: `${t("title")} · ${t("tabOrganizers")}`, description: t("organizerText") };
}

/** Centre d'aide des organisateurs (étape AB) : séparé de celui des lieux partenaires. */
export default async function HelpOrganizersPage({ params }: PageProps<"/[locale]/aide/organisateurs">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HelpHub audience="organizers" locale={locale} />;
}
