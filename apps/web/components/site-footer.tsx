import { getLocale, getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { LEGAL_INFO } from "@/lib/legal-info";
import { InstagramLink } from "./brand/instagram-link";
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
  const pairs = (items: [string, string | null][]) => items.filter(([, v]) => v).map(([k, v]) => `${k}${sep}${v}`).join(" · ");
  const legalLines = [
    pairs([[t("publisher"), LEGAL_INFO.publisher], [t("address"), LEGAL_INFO.address], ["ICE", LEGAL_INFO.ice]]),
    pairs([[t("support"), LEGAL_INFO.supportEmail], [t("privacyContact"), LEGAL_INFO.privacyEmail], [t("safetyContact"), LEGAL_INFO.safetyEmail]]),
  ].filter(Boolean);
  return (
    <footer className="mt-24 bg-[linear-gradient(180deg,var(--color-cream-light)_0%,#f8eef4_60%,#f3ecfb_100%)] pb-24 lg:pb-0">
      {/* Mobile : logo sur toute la largeur, puis les colonnes de liens deux par deux (le pied de page restait sur près de deux écrans). */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 space-y-4 md:col-span-1">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{t("tagline")}</p>
          <InstagramLink />
          <LanguageSwitch className="-ms-3" />
        </div>
        {columns.map((col, i) => (
          // Mobile : les liens juridiques, plus longs, prennent toute la largeur sur deux colonnes.
          <div key={col.title} className={i === columns.length - 1 ? "col-span-2 md:col-span-1" : ""}>
            <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
            <ul className={`mt-4 space-y-2.5 ${i === columns.length - 1 ? "grid grid-cols-2 gap-x-6 space-y-0 gap-y-2.5 md:block md:space-y-2.5" : ""}`}>
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
          {/* Les informations légales ne s'affichent que renseignées : jamais de « à compléter » visible par le public. */}
          {legalLines.length > 0 && (
            <>
              <p className="font-semibold text-ink/80">{t("legalInfoTitle")}</p>
              {legalLines.map((line) => <p key={line}>{line}</p>)}
            </>
          )}
          {LEGAL_INFO.privacyEmail && <p>{t("dataStatement", { email: LEGAL_INFO.privacyEmail })}</p>}
          {/* Direction artistique (docs/29) : la signature manuscrite de la marque (Instagram est sous le logo, plus visible). */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-2">
            <p className="me-auto">{t("rights", { year: new Date().getFullYear() })}</p>
            <span className="text-gradient font-hand text-[1.75rem] leading-none font-bold" lang="en">Your people are out there.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
