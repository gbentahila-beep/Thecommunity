import type { Category } from "@thecommunity/shared";
import { ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getAllCategories, getNextSessionPerExperience } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

export const PHOTOS: Record<string, string> = {
  eat: "/images/photos/univers-diners.webp",
  move: "/images/photos/univers-sport-bien-etre.webp",
  create: "/images/photos/univers-ateliers.webp",
  discover: "/images/photos/univers-sorties-soiree.webp",
};

/** Textes enrichis connus (messages home.universe.<id>) ; une catégorie créée plus tard garde sa description du back-office. */
export const RICH = ["eat", "move", "create", "discover"] as const;

/**
 * Étape U : les univers en 4 tuiles (2 × 2 sur téléphone, 4 côte à côte sur ordinateur), au style des cartes du site :
 * photo, nom, formats en une ligne, « N cette semaine ». Toute la tuile ouvre l'univers. Plus d'empilement qui défile.
 * Utilisé sur l'accueil et sur « Comment ça marche ».
 */
export async function Universes({ categories, title }: { categories: Category[]; title?: string }) {
  const t = await getTranslations("home");
  return (
    <section aria-labelledby="universes-title" className="py-12">
      <p className="eyebrow text-center">{t("universesEyebrow")}</p>
      <h2 id="universes-title" className="section-title mt-2 text-center">{title ?? t("universesTitle")}</h2>
      <UniverseGrid categories={categories} className="mt-8" />
    </section>
  );
}

/** Étape Y : la grille des 4 univers, la même sur l'accueil, « Comment ça marche » et l'espace membre. */
export async function UniverseGrid({ categories, cityId = DEFAULT_CITY, className = "" }: { categories: Category[]; cityId?: string; className?: string }) {
  const [t, locale, week, upcoming, all] = await Promise.all([getTranslations("home"), getLocale(), getNextSessionPerExperience({ cityId, when: "week" }), getNextSessionPerExperience({ cityId }), getAllCategories()]);
  // 24/11 : les formats affichés sont ceux qui ont vraiment des dates à venir (plus de liste figée) ; à défaut, le texte de l'univers.
  const subName = new Map(all.map((c) => [c.id, tr(c.shortName, locale)]));
  const order = new Map(all.map((c, i) => [c.id, i]));
  const formatsOf = (catId: string) => {
    const ids = [...new Set(upcoming.filter((s) => s.experience.categoryId === catId && s.experience.subcategoryId).map((s) => s.experience.subcategoryId!))];
    return ids.sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99)).map((id) => subName.get(id)).filter(Boolean).join(" · ");
  };
  return (
    <ul className={`mx-auto grid grid-cols-2 gap-3 sm:gap-4 ${categories.length <= 3 ? "max-w-4xl lg:grid-cols-3" : "max-w-5xl lg:grid-cols-4"} ${className}`} data-testid="universes-grid">
        {categories.map((c) => {
          const name = tr(c.name, locale);
          const rich = (RICH as readonly string[]).includes(c.id) ? c.id : null;
          const photo = c.imagePath || PHOTOS[c.id];
          const count = week.filter((s) => s.experience.categoryId === c.id || s.experience.subcategoryId === c.id).length;
          return (
            <li key={c.id} data-testid="universe-card">
              <Link href={`/${cityId}/${c.id}`} className="card group flex h-full flex-col overflow-hidden transition hover:shadow-float">
                <span className="relative block aspect-[4/3] overflow-hidden bg-cream-deep">
                  {photo && <MediaImage src={photo} alt={t("universePhotoAlt", { name })} fill sizes="(min-width: 1024px) 15rem, 45vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />}
                </span>
                <span className="flex flex-1 flex-col p-3 sm:p-4">
                  <span className="font-semibold text-ink">{name}</span>
                  <span className="mt-0.5 line-clamp-2 text-xs text-muted sm:text-sm">{formatsOf(c.id) || (rich ? t(`universe.${rich}.formats`) : tr(c.description, locale))}</span>
                  <span className="mt-auto flex items-center gap-0.5 pt-2 text-sm font-semibold text-brand-700">
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
