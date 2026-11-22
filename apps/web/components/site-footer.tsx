import { getLocale, getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { LEGAL_INFO } from "@/lib/legal-info";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

export async function SiteFooter() {
  const [t, locale, categories] = await Promise.all([getTranslations("footer"), getLocale(), getCategories()]);
  const sep = locale === "fr" ? " : " : ": "; // espace avant les deux-points en français seulement
  const columns = [
    {
      title: t("explore"),
      links: categories.map((c) => ({ href: `/${DEFAULT_CITY}/${c.id}`, label: tr(c.name, locale) })),
    },
    {
      title: t("company"),
      links: [
        { href: "/a-propos", label: t("about") },
        { href: "/abonnement", label: t("membership") },
        { href: "/comment-ca-marche", label: (await getTranslations("nav"))("how") },
        { href: "/blog", label: t("blog") },
        { href: "/aide", label: t("help") },
        { href: "/faq", label: t("faq") },
        { href: "/devenir-partenaire", label: (await getTranslations("nav"))("partnersLink") },
        { href: "/devenir-organisateur", label: (await getTranslations("nav"))("organizersLink") },
        { href: "/pro", label: t("organizerSpace") },
        { href: "/presse", label: t("press") },
        { href: "/contact", label: t("contact") },
      ],
    },
    {
      title: t("legal"),
      links: [
        { href: "/cgu", label: t("terms") },
        { href: "/cgv", label: t("sales") },
        { href: "/confidentialite", label: t("privacy") },
        { href: "/securite", label: t("safety") },
        { href: "/charte", label: t("charter") },
        { href: "/conditions-activites-physiques", label: t("physical") },
        { href: "/conditions-organisateurs", label: t("marketplaceTerms") },
        { href: "/contrat-organisateur", label: t("organizerTerms") },
      ],
    },
  ];
  return (
    <footer className="mt-24 border-t border-line bg-cream-deep pb-24 lg:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{t("tagline")}</p>
          <LanguageSwitch className="-ms-3" />
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  {l.href === "/pro" ? (
                    // Espace organisateur : en français, hors routage par langue (comme le back-office).
                    <NextLink href="/pro" className="text-sm text-muted hover:text-brand-900">{l.label}</NextLink>
                  ) : (
                    <Link href={l.href} className="text-sm text-muted hover:text-brand-900">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl space-y-2 px-4 py-6 text-xs text-muted sm:px-6 lg:px-8">
          <p className="font-semibold text-ink/80">{t("legalInfoTitle")}</p>
          <p>
            {t("publisher")}{sep}{LEGAL_INFO.publisher ?? t("toComplete")} · {t("address")}{sep}{LEGAL_INFO.address ?? t("toComplete")} · ICE{sep}{LEGAL_INFO.ice ?? t("toComplete")}
          </p>
          <p>
            {t("support")}{sep}{LEGAL_INFO.supportEmail ?? t("toComplete")} · {t("privacyContact")}{sep}{LEGAL_INFO.privacyEmail ?? t("toComplete")} · {t("safetyContact")}{sep}{LEGAL_INFO.safetyEmail ?? t("toComplete")}
          </p>
          <p>{t("dataStatement", { email: LEGAL_INFO.privacyEmail ?? t("toComplete") })}</p>
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
