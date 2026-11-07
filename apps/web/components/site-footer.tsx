import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { AYA_INSTAGRAM, LEGAL_INFO } from "@/lib/legal-info";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

export async function SiteFooter() {
  const [t, locale, categories] = await Promise.all([getTranslations("footer"), getLocale(), getCategories()]);
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
        { href: "/faq", label: t("faq") },
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
          <a href={AYA_INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-plum-900 hover:underline">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
            {t("instagramAya", { handle: AYA_INSTAGRAM.handle })}
          </a>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-plum-900">
                    {l.label}
                  </Link>
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
            {t("publisher")} : {LEGAL_INFO.publisher ?? t("toComplete")} · {t("address")} : {LEGAL_INFO.address ?? t("toComplete")} · ICE : {LEGAL_INFO.ice ?? t("toComplete")}
          </p>
          <p>
            {t("support")} : {LEGAL_INFO.supportEmail ?? t("toComplete")} · {t("privacyContact")} : {LEGAL_INFO.privacyEmail ?? t("toComplete")} · {t("safetyContact")} : {LEGAL_INFO.safetyEmail ?? t("toComplete")}
          </p>
          <p>{t("dataStatement", { email: LEGAL_INFO.privacyEmail ?? t("toComplete") })}</p>
          <p>{t("rights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
