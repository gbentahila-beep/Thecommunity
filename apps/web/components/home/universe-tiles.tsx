import type { Category } from "@thecommunity/shared";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getNextSessionPerExperience } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";
import { PHOTOS, RICH } from "./universes";

/**
 * Accueil membre : un bloc par univers (photo, nom, pastille de format, accroche, « N cette semaine › »).
 * Toute la carte ouvre l'univers dans le catalogue.
 */
export async function UniverseTiles({ categories, cityId = DEFAULT_CITY }: { categories: Category[]; cityId?: string }) {
  const [t, locale, week] = await Promise.all([getTranslations("home"), getLocale(), getNextSessionPerExperience({ cityId, when: "week" })]);
  return (
    <ul className="grid gap-3 sm:grid-cols-2" data-testid="universe-tiles">
      {categories.map((c) => {
        const rich = (RICH as readonly string[]).includes(c.id) ? c.id : null;
        const photo = c.imagePath || PHOTOS[c.id];
        const count = week.filter((s) => s.experience.categoryId === c.id || s.experience.subcategoryId === c.id).length;
        return (
          <li key={c.id}>
            <Link href={`/${cityId}/${c.id}`} className="card group flex h-full overflow-hidden transition hover:shadow-float">
              <span className="relative w-[34%] shrink-0 bg-cream-deep">
                {photo && <MediaImage src={photo} alt="" fill sizes="160px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col p-4">
                <span className="font-semibold text-ink">{tr(c.name, locale)}</span>
                {rich && <span className="mt-1 self-start rounded-full bg-plum-50 px-2.5 py-0.5 text-[12px] font-semibold text-plum-900">{t(`universe.${rich}.group`)}</span>}
                <span className="mt-1.5 line-clamp-2 text-sm text-muted">{rich ? t(`universe.${rich}.tagline`) : tr(c.description, locale)}</span>
                <span className="mt-auto flex items-center gap-0.5 pt-2 text-sm font-semibold text-plum-800">
                  {count > 0 ? t("tileThisWeek", { count }) : t("tileSeeDates")}
                  <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
