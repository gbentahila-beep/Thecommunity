import type { Category, Experience } from "@thecommunity/shared";
import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { MediaImage } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getPublishedExperiences } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { StickyStack } from "./sticky-stack";
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CITY } from "@/lib/site";

export const PHOTOS: Record<string, string> = {
  eat: "/images/photos/univers-diners.webp",
  move: "/images/photos/univers-sport-bien-etre.webp",
  play: "/images/photos/univers-jeux-vinyles.webp",
  create: "/images/photos/univers-ateliers.webp",
  discover: "/images/photos/univers-sorties-soiree.webp",
};

/** Couleurs des cinq univers historiques (identité : docs/18) ; les autres prennent la couleur choisie dans le back-office. */
const COLORS: Record<string, string> = { eat: "#b5563a", move: "#5f7f5e", play: "#b07a1f", create: "#a8616c", discover: "#2f3e5c" };

/** Cadrage quand le sujet n'est pas au centre (visages en haut de la photo). */
const POSITION: Record<string, string> = { discover: "object-[50%_12%]" };

/** Textes enrichis connus (messages home.universe.<id>) ; une catégorie créée plus tard garde sa description du back-office. */
export const RICH = ["eat", "move", "play", "create", "discover", "meet", "learn"] as const;

/** Taille de groupe réelle d'un univers, à partir de ses expériences publiées (tables, équipes). */
function groupRange(c: Category, experiences: Experience[]): { min: number; max: number } | null {
  const sizes = experiences.filter((e) => (e.categoryId === c.id || e.subcategoryId === c.id) && e.groupConfig).map((e) => e.groupConfig!);
  if (sizes.length === 0) return null;
  return { min: Math.min(...sizes.map((g) => g.minSize)), max: Math.max(...sizes.map((g) => g.maxSize)) };
}

/**
 * Les univers en cartes empilées : en faisant défiler, chaque carte reste accrochée en haut de l'écran et la
 * suivante glisse par-dessus (position sticky, sans JavaScript). Chaque carte : nom, accroche, photo, texte,
 * deux repères (taille du groupe, fonctionnement) et un bouton vers l'univers.
 * Utilisé sur l'accueil et sur « Comment ça marche » (titre « Les formats »).
 */
export async function Universes({ categories, title }: { categories: Category[]; title?: string }) {
  const [t, locale, experiences] = await Promise.all([getTranslations("home"), getLocale(), getPublishedExperiences()]);
  return (
    <section aria-labelledby="universes-title" className="py-12">
      <p className="eyebrow text-center">{t("universesEyebrow")}</p>
      <h2 id="universes-title" className="section-title mt-2 text-center">{title ?? t("universesTitle")}</h2>
      <StickyStack className="mx-auto mt-10 max-w-5xl space-y-6 pb-4" testId="universes-stack">
        {categories.map((c, i) => {
          const name = tr(c.name, locale);
          const rich = (RICH as readonly string[]).includes(c.id) ? c.id : null;
          const photo = c.imagePath || PHOTOS[c.id];
          const range = groupRange(c, experiences);
          const group = range ? (range.min === range.max ? t("groupExact", { n: range.min }) : t("groupRange", { min: range.min, max: range.max })) : rich ? t(`universe.${rich}.group`) : null;
          const style = { "--cat": c.color || COLORS[c.id] || DEFAULT_CATEGORY_COLOR, "--i": i } as CSSProperties;
          return (
            <li
              key={c.id}
              style={style}
              className="sticky top-[calc(4.75rem+var(--i)*0.6rem)] lg:top-[calc(6rem+var(--i)*0.9rem)]"
              data-testid="universe-card"
            >
              <article className="universe-card relative overflow-hidden rounded-3xl border border-white/70 p-5 shadow-[0_-10px_30px_-18px_rgba(42,29,31,0.35),0_18px_40px_-28px_rgba(42,29,31,0.4)] sm:p-8 md:grid md:grid-cols-[1fr_1.05fr] md:gap-x-10 md:gap-y-0">
                <div className="md:col-start-1 md:row-start-1 md:self-end">
                  <h3 className="font-display text-[1.6rem] leading-tight font-medium text-ink sm:text-4xl">{name}</h3>
                  <p className="universe-accent mt-1 text-[16px] leading-snug font-semibold sm:text-lg">{rich ? t(`universe.${rich}.tagline`) : tr(c.description, locale)}</p>
                </div>

                <div className="relative mt-4 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-center">
                  <span className="universe-badge absolute -top-5 end-5 z-10 grid size-12 place-items-center rounded-full bg-white shadow-card ring-4 ring-white/60" aria-hidden>
                    <CategoryIcon category={c.id} icon={c.icon} className="size-6" />
                  </span>
                  <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-white/50 md:aspect-[4/3.4]">
                    {photo && (
                      <MediaImage
                        src={photo}
                        alt={t("universePhotoAlt", { name })}
                        fill
                        sizes="(min-width: 768px) 30rem, 100vw"
                        className={`object-cover transition duration-500 motion-safe:hover:scale-[1.03] ${POSITION[c.id] ?? ""}`}
                      />
                    )}
                  </div>
                </div>

                <div className="md:col-start-1 md:row-start-2 md:self-start">
                  {rich && <p className="mt-4 text-[15px] leading-relaxed text-ink/85 sm:text-[16px]">{t(`universe.${rich}.text`)}</p>}
                  {(group || rich) && (
                    <dl className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3">
                      {group && (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{t("groupLabel")}</dt>
                          <dd className="mt-1 text-[15px] leading-snug font-semibold text-ink">{group}</dd>
                        </div>
                      )}
                      {rich && (
                        <div className="rounded-2xl bg-white/80 px-4 py-3">
                          <dt className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{t(`universe.${rich}.factLabel`)}</dt>
                          <dd className="mt-1 text-[15px] leading-snug font-semibold text-ink">{t(`universe.${rich}.factValue`)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <Link
                    href={`/${DEFAULT_CITY}/${c.id}`}
                    aria-label={t("universeCtaLabel", { name })}
                    className="btn btn-primary mt-4 w-full"
                  >
                    {rich ? t(`universe.${rich}.cta`) : t("universeCta")}
                    <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </StickyStack>
    </section>
  );
}
