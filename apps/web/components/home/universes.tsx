import type { Category } from "@thecommunity/shared";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-text";
import { CATEGORY_STYLES, DEFAULT_CITY } from "@/lib/site";

const PHOTOS: Record<string, string> = {
  eat: "/images/photos/univers-diners.webp",
  move: "/images/photos/univers-sport-bien-etre.webp",
  play: "/images/photos/univers-jeux-vinyles.webp",
  create: "/images/photos/univers-ateliers.webp",
  discover: "/images/photos/univers-sorties-soiree.webp",
};

/** Cadrage dans le format 4:3 quand le sujet n'est pas au centre (visages en haut de la photo). */
const POSITION: Record<string, string> = { discover: "object-[50%_12%]" };

/**
 * Les cinq univers, en alternance : photo d'un côté, texte et bouton de l'autre.
 * Utilisé sur l'accueil et sur « Comment ça marche » (titre « Les formats », étape 12b).
 */
export async function Universes({ categories, title }: { categories: Category[]; title?: string }) {
  const [t, locale] = await Promise.all([getTranslations("home"), getLocale()]);
  return (
    <section aria-labelledby="universes-title" className="py-12">
      <h2 id="universes-title" className="text-center font-display text-[1.75rem] leading-tight font-medium text-plum-900 sm:text-[2.25rem]">{title ?? t("universesTitle")}</h2>
      <ul className="mt-10 space-y-10 sm:space-y-14">
        {categories.map((c, i) => {
          const name = tr(c.name, locale);
          const style = CATEGORY_STYLES[c.id];
          return (
            <li key={c.id} className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
              <div className={`relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-card ${i % 2 ? "md:order-1" : "md:order-2"}`}>
                {PHOTOS[c.id] && <Image src={PHOTOS[c.id]!} alt={t("universePhotoAlt", { name })} fill sizes="(min-width: 768px) 45vw, 100vw" className={`object-cover transition duration-500 hover:scale-[1.03] ${POSITION[c.id] ?? ""}`} />}
              </div>
              <div className={i % 2 ? "md:order-2" : "md:order-1"}>
                <span className={`inline-grid size-12 place-items-center rounded-full ${style?.bg} ${style?.text}`}>
                  <CategoryIcon category={c.id} className="size-6" />
                </span>
                <h3 className="mt-4 font-display text-3xl font-medium text-plum-900 sm:text-4xl">{name}</h3>
                <p className="mt-3 max-w-md text-[16px] leading-relaxed text-ink/80">{tr(c.description, locale)}</p>
                <Link
                  href={`/${DEFAULT_CITY}/${c.id}`}
                  aria-label={t("universeCtaLabel", { name })}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white"
                >
                  {t("universeCta")}
                  <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
