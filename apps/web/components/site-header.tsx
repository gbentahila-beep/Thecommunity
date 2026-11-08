import { UserRound } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { CATEGORY_STYLES, DEFAULT_CITY } from "@/lib/site";
import { CityMenu } from "./city-menu";
import { DiscoverMenu } from "./discover-menu";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

export async function SiteHeader({ cityId = DEFAULT_CITY }: { cityId?: string }) {
  const [t, locale, categories] = await Promise.all([getTranslations("nav"), getLocale(), getCategories()]);
  const discover = [
    { href: "/experiences", label: t("allExperiences") },
    ...categories.map((c) => ({ href: `/${cityId}/${c.id}`, label: tr(c.name, locale), dot: CATEGORY_STYLES[c.id]?.dot })),
  ];
  const links = [
    { href: "/a-propos", label: t("about") },
    { href: "/comment-ca-marche", label: t("how") },
    { href: "/blog", label: t("blog") },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Logo />
        <nav aria-label={t("mainNav")} className="ms-8 hidden items-center gap-1 lg:flex">
          <DiscoverMenu label={t("discover")} menuLabel={t("discoverMenu")} items={discover} />
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-[15px] text-ink/85 hover:bg-cream-deep hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <CityMenu currentCityId={cityId} />
          </div>
          <LanguageSwitch className="hidden sm:inline-flex" />
          <Link
            href="/espace"
            aria-label={t("account")}
            className="grid size-11 place-items-center rounded-full bg-cream-deep text-plum-900 transition hover:bg-sand"
          >
            <UserRound className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
