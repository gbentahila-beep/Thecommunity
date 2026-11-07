import { UserRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DEFAULT_CITY } from "@/lib/site";
import { CityMenu } from "./city-menu";
import { LanguageSwitch } from "./language-switch";
import { Logo } from "./logo";

export async function SiteHeader({ cityId = DEFAULT_CITY }: { cityId?: string }) {
  const t = await getTranslations("nav");
  const links = [
    { href: "/experiences", label: t("discover") },
    { href: `/${cityId}/eat`, label: t("dinners") },
    { href: `/${cityId}`, label: t("activities") },
    { href: "/comment-ca-marche", label: t("how") },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-cream/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Logo />
        <nav aria-label={t("mainNav")} className="ms-8 hidden items-center gap-1 lg:flex">
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
