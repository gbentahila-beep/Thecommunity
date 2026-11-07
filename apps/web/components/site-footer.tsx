import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
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
        { href: "/charte", label: t("charter") },
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
        <p className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted sm:px-6 lg:px-8">
          {t("rights", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
