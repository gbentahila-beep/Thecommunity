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
        {why.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="rounded-[1.75rem] bg-white p-6 shadow-card">
            <span className={`${i % 2 ? "bub-lilac" : "bub-peach"} grid size-12 place-items-center rounded-full text-ink`}><Icon className="size-5" strokeWidth={1.7} aria-hidden /></span>
            <p className="mt-4 font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink/75">{text}</p>
          </li>
        ))}
      </ul>
      {FIREBASE_ENABLED ? <PartnerApplicationForm /> : <p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{t("demo")}</p>}
      <p className="flex flex-col gap-2">
        <Link href="/aide/partenaires" className="font-medium text-brand-900 underline underline-offset-4">{t("helpLink")}</Link>
        <Link href="/devenir-organisateur" className="font-medium text-brand-900 underline underline-offset-4">{t("organizersLink")}</Link>
      </p>
    </StaticPage>
  );
}
