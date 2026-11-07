import { ChevronDown, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCities } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

/** Sélecteur de ville sans JavaScript (élément <details>). */
export async function CityMenu({ currentCityId = DEFAULT_CITY }: { currentCityId?: string }) {
  const [cities, locale, t] = await Promise.all([getCities(), getLocale(), getTranslations("nav")]);
  const current = cities.find((c) => c.id === currentCityId) ?? cities[0];
  return (
    <details className="group relative">
      <summary
        className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-cream-deep px-4 py-2 text-sm font-medium text-ink transition hover:bg-sand [&::-webkit-details-marker]:hidden"
        aria-label={t("chooseCity")}
      >
        <MapPin className="size-4 text-plum-900" aria-hidden />
        {current ? tr(current.name, locale) : ""}
        <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <ul className="absolute start-1/2 z-40 mt-2 w-56 -translate-x-1/2 rtl:translate-x-1/2 sm:start-auto sm:end-0 sm:translate-x-0 rtl:sm:translate-x-0 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-float">
        {cities.map((city) => (
          <li key={city.id}>
            {city.isActive ? (
              <Link
                href={`/${city.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-cream"
              >
                {tr(city.name, locale)}
                {city.id === current?.id && <span className="size-2 rounded-full bg-plum-700" aria-hidden />}
              </Link>
            ) : (
              <span className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-muted">
                {tr(city.name, locale)}
                <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium">{t("comingSoon")}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
