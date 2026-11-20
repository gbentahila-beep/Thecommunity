import { AccountLink } from "./account-link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, getCities } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { categoryTone, DEFAULT_CITY } from "@/lib/site";
import { CityMenu } from "./city-menu";
import { DiscoverMenu } from "./discover-menu";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { SearchBox } from "./search-box";
import { HeaderBell } from "./header-bell";
import { Search } from "lucide-react";

export async function SiteHeader({ cityId = DEFAULT_CITY }: { cityId?: string }) {
  const [t, locale, categories, cities] = await Promise.all([getTranslations("nav"), getLocale(), getCategories(), getCities()]);
  const discover = [
    { href: "/experiences", label: t("allExperiences") },
    ...categories.map((c) => ({ href: `/${cityId}/${c.id}`, label: tr(c.name, locale), dot: categoryTone(c).dot, dotStyle: categoryTone(c).style })),
  ];
  const links = [
    { href: "/a-propos", label: t("about") },
    { href: "/comment-ca-marche", label: t("how") },
    { href: "/blog", label: t("blog") },
  ];
  const cityItems = cities.map((c) => ({ id: c.id, name: tr(c.name, locale), active: c.isActive }));
  return (
    <header className="sticky top-0 z-30 px-3 pt-2 lg:border-b lg:border-line/60 lg:bg-cream/90 lg:px-0 lg:pt-0 lg:backdrop-blur-md">
      {/* Mobile : barre flottante (logo, S'inscrire, menu) ; ordinateur : barre pleine largeur. */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-full border border-line/60 bg-white/95 ps-5 pe-2 max-[379px]:gap-2 max-[379px]:ps-4 shadow-card backdrop-blur-md lg:h-20 lg:gap-4 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-8 lg:shadow-none lg:backdrop-blur-none">
        <Logo />
        <nav aria-label={t("mainNav")} className="ms-8 hidden items-center gap-1 lg:flex xl:ms-6">
          <DiscoverMenu label={t("discover")} menuLabel={t("discoverMenu")} items={discover} />
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-full px-3 py-2 text-[15px] text-ink/85 hover:bg-cream-deep hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto hidden items-center gap-2 lg:flex">
          <div className="hidden w-44 xl:block 2xl:w-64">
            <SearchBox />
          </div>
          <Link href="/experiences" aria-label={t("search")} className="grid size-10 place-items-center rounded-full text-ink/80 hover:bg-cream-deep xl:hidden">
            <Search className="size-5" aria-hidden />
          </Link>
          <CityMenu currentCityId={cityId} />
          <LanguageSwitch />
          <HeaderBell />
          <AccountLink label={t("account")} />
        </div>
        <div className="ms-auto flex items-center gap-1 lg:hidden">
          <HeaderBell mobile />
          <MobileMenu discover={discover} links={links} cities={cityItems} />
        </div>
      </div>
    </header>
  );
}
