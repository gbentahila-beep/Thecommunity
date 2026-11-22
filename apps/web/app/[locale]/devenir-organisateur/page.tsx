import { ArrowRight, BadgeCheck, CreditCard, Users } from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/devenir-organisateur">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "organizerPage" });
  return { title: t("title"), description: t("intro"), alternates: { canonical: locale === "fr" ? "/devenir-organisateur" : `/${locale}/devenir-organisateur` } };
}

/**
 * Organisateurs (docs/16) : personnes ou sociétés qui publient et vendent leurs propres activités depuis l'espace
 * organisateur (/pro). À ne pas confondre avec les lieux partenaires (qui accueillent nos groupes) ni avec les membres
 * de confiance (habitués invités à proposer des sorties).
 */
export default async function BecomeOrganizerPage({ params }: PageProps<"/[locale]/devenir-organisateur">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("organizerPage");
  const why = [
    { icon: BadgeCheck, title: t("why1Title"), text: t("why1") },
    { icon: CreditCard, title: t("why2Title"), text: t("why2") },
    { icon: Users, title: t("why3Title"), text: t("why3") },
  ];
  return (
    <StaticPage title={t("title")} intro={t("intro")}>
      <ul className="grid gap-4 sm:grid-cols-3">
        {why.map(({ icon: Icon, title, text }) => (
          <li key={title} className="card p-5">
            <Icon className="size-6 text-brand-900" aria-hidden />
            <p className="mt-3 font-semibold text-ink">{title}</p>
            <p className="mt-1 text-sm text-ink/75">{text}</p>
          </li>
        ))}
      </ul>
      <section aria-labelledby="org-steps">
        <h2 id="org-steps" className="section-title">{t("stepsTitle")}</h2>
        <ol className="mt-4 space-y-3">
          {[t("step1"), t("step2"), t("step3"), t("step4")].map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-900 text-sm font-semibold text-white">{i + 1}</span>
              <span className="pt-1 text-ink/85">{s}</span>
            </li>
          ))}
        </ol>
      </section>
      {/* L'espace organisateur n'est pas traduit : formulaire en français, connexion demandée si besoin. */}
      <NextLink href="/pro/inscription" className="btn btn-primary" data-testid="organizer-cta">
        {t("cta")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </NextLink>
      <section aria-labelledby="org-roles" className="info-box text-start">
        <h2 id="org-roles" className="font-display text-[1.45rem] font-medium text-brand-900">{t("roles")}</h2>
        <ul className="mt-3 space-y-2 text-[15px] text-ink/85">
          <li>{t("roleVenue")}</li>
          <li>{t("roleOrganizer")}</li>
          <li>{t("roleTrusted")}</li>
        </ul>
      </section>
      <p className="flex flex-col gap-2">
        <Link href="/aide/partenaires" className="font-medium text-brand-900 underline underline-offset-4">{t("help")}</Link>
        <Link href="/devenir-partenaire" className="font-medium text-brand-900 underline underline-offset-4">{t("venueLink")}</Link>
      </p>
    </StaticPage>
  );
}
