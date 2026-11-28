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
    <section aria-labelledby="universes-title">
      <div className="section-head container-text mx-auto text-center">
        <p className="eyebrow">{t("universesEyebrow")}</p>
        <h2 id="universes-title" className="section-title mt-3">{title ?? t("universesTitle")}</h2>
      </div>
      <UniverseGrid categories={categories} />
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
    // Étape 7c (docs/29) : cartes photo pleine hauteur, posées sur un fond pêche ou lilas légèrement tourné (photo
    // « emboîtée ») ; défilement horizontal sur téléphone, grille sur ordinateur.
    <ul className={`-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pt-2 pb-6 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 ${categories.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"} lg:gap-8 ${className}`} data-testid="universes-grid">
        {categories.map((c, i) => {
          const name = tr(c.name, locale);
          const rich = (RICH as readonly string[]).includes(c.id) ? c.id : null;
          const photo = c.imagePath || PHOTOS[c.id];
          const count = week.filter((s) => s.experience.categoryId === c.id || s.experience.subcategoryId === c.id).length;
          return (
            <li key={c.id} data-testid="universe-card" className="w-[74%] shrink-0 snap-start sm:w-auto">
              <Link href={`/${cityId}/${c.id}`} className="group relative block rounded-[1.75rem] focus-visible:outline-offset-4">
                <span aria-hidden className={`absolute -inset-2.5 -rotate-3 rounded-[2.1rem] transition duration-300 group-hover:-rotate-[4.5deg] ${i % 2 ? "bg-lilac" : "bg-peach"}`} />
                <span className="relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-cream-deep shadow-card">
                  {photo && <MediaImage src={photo} alt={t("universePhotoAlt", { name })} fill sizes="(min-width: 1024px) 24rem, (min-width: 640px) 32vw, 74vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />}
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 via-45% to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col p-5 text-white">
                    <span className="font-display text-[1.75rem] leading-none font-semibold tracking-[-0.01em]">{name}</span>
                    <span className="mt-1.5 line-clamp-1 text-sm text-white/80">{formatsOf(c.id) || (rich ? t(`universe.${rich}.formats`) : tr(c.description, locale))}</span>
                    <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-ink">
                      {count > 0 && <span className="size-1.5 rounded-full bg-gradient-brand" aria-hidden />}
                      {count > 0 ? t("tileThisWeek", { count }) : t("tileSeeDates")}
                      <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
  );
}
