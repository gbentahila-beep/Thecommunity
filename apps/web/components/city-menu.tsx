import { ChevronDown, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCities } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

/**
 * Sélecteur de ville sans JavaScript (élément <details>). Le chevron ouvre la liste des villes ; celles qui ne
 * sont pas encore ouvertes sont marquées « bientôt ».
 * - « pill » : pastille de l'en-tête (épingle + chevron) ;
 * - « title » : dans un titre (« Cette semaine à Casablanca ▾ »), même police que le titre ;
 * - « label » : épingle + nom + chevron (en-tête du catalogue).
 */
export async function CityMenu({ currentCityId = DEFAULT_CITY, variant = "pill", align = "end" }: { currentCityId?: string; variant?: "pill" | "title" | "label"; align?: "start" | "end" }) {
  const [cities, locale, t] = await Promise.all([getCities(), getLocale(), getTranslations("nav")]);
  const current = cities.find((c) => c.id === currentCityId) ?? cities[0];
  return (
    <details className={`group relative ${variant === "pill" ? "" : "inline-block"}`}>
      {variant === "pill" ? (
        <summary
          className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-cream-deep px-3 py-2 xl:px-4 text-sm font-medium text-ink transition hover:bg-sand [&::-webkit-details-marker]:hidden"
          aria-label={t("chooseCity")}
        >
          <MapPin className="size-4 text-plum-900" aria-hidden />
          <span className="hidden 2xl:inline">{current ? tr(current.name, locale) : ""}</span>
          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
        </summary>
      ) : (
        <summary
          className={`inline-flex cursor-pointer list-none items-center gap-1 rounded-lg transition [&::-webkit-details-marker]:hidden ${variant === "title" ? "text-plum-900 underline decoration-plum-200 decoration-2 underline-offset-[6px] hover:decoration-plum-700" : "text-[15px] font-semibold text-plum-900 hover:text-plum-700"}`}
          aria-label={`${t("chooseCity")} : ${current ? tr(current.name, locale) : ""}`}
          data-testid="city-select"
        >
          {variant === "label" && <MapPin className="me-0.5 size-4" aria-hidden />}
          {current ? tr(current.name, locale) : ""}
          <ChevronDown className={`${variant === "title" ? "size-6" : "size-4"} shrink-0 transition group-open:rotate-180`} aria-hidden />
        </summary>
      )}
      <ul className={`absolute z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 font-sans text-base font-normal shadow-float ${variant === "pill" ? "start-1/2 -translate-x-1/2 rtl:translate-x-1/2 sm:start-auto sm:end-0 sm:translate-x-0 rtl:sm:translate-x-0" : align === "start" ? "start-0" : "end-0"}`}>
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
