import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategories, getCities } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { CityMenu } from "./city-menu";
import { DiscoverMenu } from "./discover-menu";
import { HeaderAuth } from "./header-auth";
import { HeaderSearch } from "./header-search";
import { LanguageMenu } from "./language-menu";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { HeaderBell } from "./header-bell";

export async function SiteHeader({ cityId = DEFAULT_CITY }: { cityId?: string }) {
  const [t, locale, categories, cities] = await Promise.all([getTranslations("nav"), getLocale(), getCategories(), getCities()]);
  const discover = [
    { href: "/experiences", label: t("allExperiences") },
    ...categories.map((c) => ({ href: `/${cityId}/${c.id}`, label: tr(c.name, locale), sub: true })),
  ];
  // Menu du haut : Découvrir · À propos · Comment ça marche · Blog · Abonnement · Questions-réponses · Avis.
  const links = [
    { href: "/a-propos", label: t("about") },
    { href: "/comment-ca-marche", label: t("how") },
    { href: "/blog", label: t("blog") },
    { href: "/abonnement", label: t("membership") },
    { href: "/faq", label: t("questions") },
    { href: "/avis", label: t("reviews") },
  ];
  const navLink = "whitespace-nowrap rounded-full px-2.5 py-2 text-[15px] text-ink/85 hover:bg-cream-deep hover:text-ink xl:px-3";
  const more = (withHow: boolean) => [
    ...(withHow ? [{ href: "/comment-ca-marche", label: t("how") }] : []),
    { href: "/a-propos", label: t("about") },
    { href: "/blog", label: t("blog") },
    { href: "/faq", label: t("questions") },
  ];
  const cityItems = cities.map((c) => ({ id: c.id, name: tr(c.name, locale), active: c.isActive }));
  return (
    <header className="sticky top-0 z-30 px-3 pt-2 lg:border-b lg:border-line/60 lg:bg-cream/90 lg:px-0 lg:pt-0 lg:backdrop-blur-md">
      {/* Mobile : barre flottante (logo, S'inscrire, menu) ; ordinateur : barre pleine largeur. */}
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 rounded-full border border-line/60 bg-white/95 ps-5 pe-2 max-[379px]:gap-2 max-[379px]:ps-4 shadow-card backdrop-blur-md lg:h-20 lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-6 xl:gap-4 xl:px-8 lg:shadow-none lg:backdrop-blur-none">
        <Logo />
        <nav aria-label={t("mainNav")} className="ms-3 hidden items-center gap-0.5 lg:flex xl:ms-6 xl:gap-1">
          <DiscoverMenu label={t("discover")} menuLabel={t("discoverMenu")} items={discover} />
          <Link href="/comment-ca-marche" className={`${navLink} hidden 2xl:inline-flex`}>{t("how")}</Link>
          <Link href="/abonnement" className={navLink}>{t("membership")}</Link>
          <Link href="/avis" className={navLink}>{t("reviews")}</Link>
          <div className="2xl:hidden"><DiscoverMenu label={t("more")} menuLabel={t("more")} items={more(true)} firstBold={false} /></div>
          <div className="hidden 2xl:block"><DiscoverMenu label={t("more")} menuLabel={t("more")} items={more(false)} firstBold={false} /></div>
        </nav>
        <div className="ms-auto hidden items-center gap-1 lg:flex xl:gap-1.5">
          <HeaderSearch />
          <CityMenu currentCityId={cityId} />
          <LanguageMenu />
          <HeaderBell />
          <HeaderAuth />
        </div>
        <div className="ms-auto flex items-center gap-1 lg:hidden">
          <HeaderBell mobile />
          <MobileMenu discover={discover} links={links} cities={cityItems} />
        </div>
      </div>
    </header>
  );
}
