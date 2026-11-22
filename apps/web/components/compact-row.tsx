import { experienceBadge, formatMoney, seatsAvailable, type Experience, type Session, restaurantBudget } from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getCategory, getHomeSettings } from "@/lib/data";
import { formatDaySlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { groupLabel } from "./experience-card";
import { budgetText } from "./price-tag";

/**
 * Ligne compacte d'une expérience (accueil, tableau de bord, « Déjà vécues ») : vignette, titre + badge, jour et heure
 * (ou « Prochaines dates bientôt » sans date),
 * quartier · groupe, univers ; prix à droite. Toute la ligne ouvre la fiche.
 */
export async function CompactRow({ experience, session, priority = false }: { experience: Experience; session?: Session; priority?: boolean }) {
  const [locale, t, category, home, tp] = await Promise.all([getLocale(), getTranslations("card"), getCategory(experience.categoryId), getHomeSettings(), getTranslations("twoPart")]);
  const budget = restaurantBudget(experience);
  const full = session ? session.status === "full" || seatsAvailable(session) === 0 : false;
  const badge = full ? null : experienceBadge(experience, session, new Date(), home.featuredExperienceIds);
  const cover = experience.images[0];
  const price = session?.price ?? experience.price;
  const pill = "rounded-full px-2 py-0.5 text-[11px] font-semibold";
  return (
    <article className="group relative flex gap-3.5 px-4 py-3.5" data-testid="compact-row">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream-deep">
        {cover && <Image src={cover.path} alt="" fill priority={priority} sizes="64px" className="object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[15px] leading-snug font-semibold text-ink">
            <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-brand-700">
              {tr(experience.title, locale)}
            </Link>
          </h3>
          <span className="shrink-0 text-[14px] font-semibold text-ink">{formatMoney(price, locale as "fr" | "ar" | "en")}</span>
        </div>
        <p className="mt-0.5 text-[13px] text-ink/80">{session ? formatDaySlot(session.startAt, locale) : t("datesSoon")}</p>
        <p className="truncate text-[13px] text-muted">
          {experience.district}
          {session && ` · ${await groupLabel(experience, session)}`}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {category && <span className={`${pill} bg-cream-deep text-ink/80`}>{tr(category.shortName, locale)}</span>}
          {budget?.kind === "range" && <span className={`${pill} bg-cream-deep text-ink/80`}>{tp("restaurantPill", { amount: budgetText(budget, locale as "fr" | "ar" | "en") })}</span>}
          {experience.venue.revealPolicy === "on_group_reveal" && <span className={`${pill} bg-cream-deep text-ink/80`}>{tp("surprisePill")}</span>}
          {experience.audience === "women" && <span className={`${pill} bg-brand-100 text-brand-900`}>{t("women")}</span>}
          {full ? <span className={`${pill} bg-ink/80 text-white`}>{t("full")}</span> : badge && <span className={`${pill} ${badge === "featured" ? "bg-brand-900 text-white" : "bg-badge text-brand-900"}`}>{t(`badge_${badge}`)}</span>}
        </div>
      </div>
    </article>
  );
}
