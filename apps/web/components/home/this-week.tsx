import type { Session, Experience } from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { CityMenu } from "@/components/city-menu";
import { CompactRow } from "@/components/compact-row";
import { NewExperienceAlerts } from "@/components/new-experience-alerts";
import { getCategories, getCities, getNextSessionPerExperience } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { WeekList } from "./week-list";

/**
 * Accueil (intro) : « Votre semaine Wenzy », « à Casablanca ▾ », le principe, puis la liste. Ailleurs : « Cette semaine à Casablanca ▾ » (accueil visiteur et accueil membre) : le chevron ouvre la liste des villes,
 * les pastilles filtrent sur place, puis les lignes compactes, « Voir toutes les expériences » et la ligne d'alerte.
 * Si la semaine est calme, la liste est complétée par les prochaines dates.
 */
export async function ThisWeek({ limit, cityId = DEFAULT_CITY, intro = false }: { limit: number; cityId?: string; /** Accueil : le principe des rendez-vous de la semaine, au-dessus de la liste. */ intro?: boolean }) {
  const [t, tf, locale, categories, cities, week, upcoming] = await Promise.all([
    getTranslations("home"),
    getTranslations("filters"),
    getLocale(),
    getCategories(),
    getCities(),
    getNextSessionPerExperience({ cityId, when: "week" }),
    getNextSessionPerExperience({ cityId }),
  ]);
  const pool: (Session & { experience: Experience })[] = week.length >= Math.min(limit, 4) ? week : upcoming;
  // Dans l'ordre chronologique ; les dates complètes en dernier.
  const sorted = [...pool].sort((a, b) => Number(a.status === "full") - Number(b.status === "full") || a.startAt.localeCompare(b.startAt));
  const items = await Promise.all(
    sorted.map(async (s, i) => ({
      id: s.id,
      categories: [s.experience.categoryId, s.experience.subcategoryId].filter((x): x is string => Boolean(x)),
      node: await CompactRow({ experience: s.experience, session: s, priority: i < 2 }),
    })),
  );
  return (
    <section aria-labelledby="this-week-title" className="space-y-6" data-testid="home-thisWeek">
      {intro ? (
        <>
          <div className="container-text" data-testid="week-intro">
            <p className="eyebrow">{t("weekRvEyebrow")}</p>
            <h2 id="this-week-title" className="section-title mt-3">{t("weekRvTitle")}</h2>
            {/* Le choix de la ville, juste sous le titre (« à Casablanca ▾ ») : remplace « Cette semaine à… », redondant. */}
            <p className="relative mt-1 flex flex-wrap items-baseline gap-x-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
              {t("weekAt")} <CityMenu variant="title" align="start" currentCityId={cityId} />
            </p>
            <p className="lead mt-3">{t("weekRvText")}</p>
          </div>
        </>
      ) : (
        <h2 id="this-week-title" className="section-title relative flex flex-wrap items-baseline gap-x-2">
          {t("thisWeekAt")} <CityMenu variant="title" align="start" currentCityId={cityId} />
        </h2>
      )}
      <WeekList
        chips={[
          { id: null, label: tf("all") },
          ...categories.map((c) => ({ id: c.id, label: tr(c.shortName, locale), icon: <CategoryIcon category={c.id} icon={c.icon} className="size-4" /> })),
        ]}
        items={items}
        limit={limit}
        seeAll={{ href: `/${cityId}`, label: t("seeAll") }}
        empty={t("weekEmpty")}
      />
      <div className="pt-3">
        <NewExperienceAlerts cities={cities.map((c) => ({ id: c.id, name: tr(c.name, locale), active: c.isActive }))} defaultCity={cityId} />
      </div>
    </section>
  );
}
