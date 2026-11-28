import { Check, ChevronDown, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCities } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

/**
 * Sélecteur de ville sans JavaScript (élément <details>). Le chevron ouvre la liste des villes ; celles qui ne
 * sont pas encore ouvertes sont marquées « bientôt ».
 * - « pill » : pastille de l'en-tête (épingle + chevron) ;
 * - « title » : dans un titre (« Cette semaine à Casablanca ▾ »), même police que le titre ; la liste s'ouvre sous
 *   le titre entier, centrée comme lui (le titre doit être « relative »), pour ne jamais sortir de l'écran ;
 * - « label » : épingle + nom + chevron (en-tête du catalogue).
 */
export async function CityMenu({ currentCityId = DEFAULT_CITY, variant = "pill", align = "end" }: { currentCityId?: string; variant?: "pill" | "title" | "label"; align?: "start" | "end" }) {
  const [cities, locale, t] = await Promise.all([getCities(), getLocale(), getTranslations("nav")]);
  const current = cities.find((c) => c.id === currentCityId) ?? cities[0];
  return (
    <details className={`group ${variant === "title" ? "inline-block" : variant === "label" ? "relative inline-block" : "relative"}`}>
      {variant === "pill" ? (
        <summary
          className="flex cursor-pointer list-none items-center gap-2 rounded-full bg-cream-deep px-3 py-2 xl:px-4 text-sm font-medium text-ink transition hover:bg-sand [&::-webkit-details-marker]:hidden"
          aria-label={t("chooseCity")}
        >
          <MapPin className="size-4 text-brand-900" aria-hidden />
          <span className="hidden 2xl:inline">{current ? tr(current.name, locale) : ""}</span>
          <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
        </summary>
      ) : (
        <summary
          className={`inline-flex cursor-pointer list-none items-center gap-1 transition [&::-webkit-details-marker]:hidden ${variant === "title" ? "rounded-lg text-brand-900 underline decoration-brand-200 decoration-2 underline-offset-[6px] hover:decoration-brand-700" : "rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-900 ring-1 ring-line hover:ring-brand-200"}`}
          aria-label={`${t("chooseCity")} : ${current ? tr(current.name, locale) : ""}`}
          data-testid="city-select"
        >
          {variant === "label" && <MapPin className="me-0.5 size-4" aria-hidden />}
          {current ? tr(current.name, locale) : ""}
          <ChevronDown className={`${variant === "title" ? "size-6" : "size-4"} shrink-0 transition group-open:rotate-180`} aria-hidden />
        </summary>
      )}
      <ul className={`absolute z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white p-1.5 font-sans text-base font-normal shadow-float ${variant === "pill" ? "start-1/2 -translate-x-1/2 rtl:translate-x-1/2 sm:start-auto sm:end-0 sm:translate-x-0 rtl:sm:translate-x-0" : variant === "title" ? "start-1/2 top-full max-w-[calc(100vw-2rem)] -translate-x-1/2 rtl:translate-x-1/2" : align === "start" ? "start-0" : "end-0"}`}>
        {cities.map((city) => (
          <li key={city.id}>
            {city.isActive ? (
              <Link
                href={`/${city.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm hover:bg-cream"
              >
                {tr(city.name, locale)}
                {city.id === current?.id && <Check className="size-4 text-brand-700" aria-hidden />}
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
