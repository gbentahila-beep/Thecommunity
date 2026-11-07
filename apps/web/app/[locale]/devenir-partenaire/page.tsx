import { Handshake, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PartnerApplicationForm } from "@/components/help/partner-application-form";
import { StaticPage } from "@/components/static-page";
import { Link } from "@/i18n/navigation";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export async function generateMetadata({ params }: PageProps<"/[locale]/devenir-partenaire">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "partner" });
  return { title: t("title"), description: t("intro"), alternates: { canonical: locale === "fr" ? "/devenir-partenaire" : `/${locale}/devenir-partenaire` } };
}

export default async function BecomePartnerPage({ params }: PageProps<"/[locale]/devenir-partenaire">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("partner");
  const why = [
    { icon: Users, title: t("why1Title"), text: t("why1") },
    { icon: Handshake, title: t("why2Title"), text: t("why2") },
    { icon: Sparkles, title: t("why3Title"), text: t("why3") },
  ];
  return (
    <StaticPage title={t("title")} intro={t("intro")}>
      <ul className="grid gap-4 sm:grid-cols-3">
        {why.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
            <Icon className="size-6 text-plum-900" aria-hidden />
            <p className="mt-3 font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink/75">{text}</p>
          </li>
        ))}
      </ul>
      {FIREBASE_ENABLED ? <PartnerApplicationForm /> : <p className="rounded-2xl bg-plum-50 p-4 text-sm text-plum-900">{t("demo")}</p>}
      <p>
        <Link href="/aide/partenaires" className="font-medium text-plum-900 underline underline-offset-4">{t("helpLink")}</Link>
      </p>
    </StaticPage>
  );
}
