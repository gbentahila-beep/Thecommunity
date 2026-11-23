import { experienceBadge, LOW_SEATS_THRESHOLD, pricingOf, seatsAvailable, type Experience, type Session, restaurantBudget } from "@thecommunity/shared";
import { Gem, MapPin, Star, Users } from "lucide-react";
import { BADGE_TONE, TIER_TONE, WOMEN_TONE } from "./card-pills";
import { MediaImage as Image } from "@/components/media";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCategory, getHomeSettings, getMembershipPlan } from "@/lib/data";
import { memberAmountFor, PriceTag } from "./price-tag";
import { formatShortSlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { FavoriteButton } from "./favorite-button";

export async function groupLabel(experience: Experience, session: Pick<Session, "capacity">) {
  const t = await getTranslations("card");
  const g = experience.groupConfig;
  switch (experience.bookingMode) {
    case "social_dinner":
      return t("people", { count: g?.targetSize ?? 6 });
    case "group":
      return g && g.minSize !== g.maxSize ? t("peopleRange", { min: g.minSize, max: g.maxSize }) : t("people", { count: g?.maxSize ?? 6 });
    case "open":
      return t("openFormat");
    default:
      return t("places", { count: session.capacity });
  }
}

export async function ExperienceCard({
  session,
  experience,
  priority = false,
}: {
  /** Prochaine date ; absente pour une expérience sans date à venir (« Prochaines dates bientôt »). */
  session?: Session;
  experience: Experience;
  priority?: boolean;
}) {
  const [locale, t, t2, category, subcategory, plan, home] = await Promise.all([getLocale(), getTranslations("card"), getTranslations("twoPart"), getCategory(experience.categoryId), experience.subcategoryId ? getCategory(experience.subcategoryId) : Promise.resolve(null), getMembershipPlan(), getHomeSettings()]);
  const shownPrice = session?.price ?? experience.price;
  const left = session ? seatsAvailable(session) : 0;
  const full = Boolean(session) && (session!.status === "full" || left === 0);
  const cover = experience.images[0];
  // Un badge au plus (choisi par l'équipe, sinon automatique), jamais sur une date complète.
  const badge = full ? null : experienceBadge(experience, session, new Date(), home.featuredExperienceIds);
  const tier = experience.venueTier ?? null;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden">
        {cover && (
          <Image
            src={cover.path}
            alt={tr(cover.alt, locale)}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 300px, (min-width: 768px) 45vw, 90vw"
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        )}
        {/* Étape O : ce que c'est, dès la carte : format (ou univers) et gamme. */}
        <div className="absolute bottom-3 start-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-badge px-3 py-1 text-xs font-medium text-brand-900">
            {subcategory ? tr(subcategory.shortName, locale) : category ? tr(category.shortName, locale) : ""}
          </span>
          {tier && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TIER_TONE[tier]}`} data-testid="card-tier">
              {tier !== "casual" && <Gem className="size-3.5" aria-hidden />}
              {t2(`tier_${tier}`)}
            </span>
          )}
        </div>
        <div className="absolute top-3 start-3 flex flex-col items-start gap-1.5">
          {experience.audience === "women" && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${WOMEN_TONE}`} data-testid="card-women">{t("women")}</span>
          )}
          {full ? (
            <span className="rounded-full bg-ink/80 px-3 py-1 text-xs font-medium text-white">
              {t("full")}
            </span>
          ) : session && left <= LOW_SEATS_THRESHOLD ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-800">
              {t("lastSeats", { count: left })}
            </span>
          ) : null}
          {badge && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_TONE[badge]}`} data-testid="card-badge">
              {t(`badge_${badge}`)}
            </span>
          )}
        </div>
        <FavoriteButton experienceId={experience.id} className="absolute end-3 top-3 z-10" />
        {experience.membersOnly && (
          <span className="btn btn-primary btn-sm absolute bottom-3 end-3">{t("membersOnly")}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-[17px] font-semibold leading-snug text-ink">
          <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0">
            {tr(experience.title, locale)}
          </Link>
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="size-4 shrink-0 text-brand-700" aria-hidden />
          {[experience.district, session ? formatShortSlot(session.startAt, locale) : t("datesSoon")].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <p>
            <PriceTag price={shownPrice} memberAmount={memberAmountFor(plan, shownPrice, experience)} lang={locale as "fr" | "ar" | "en"} memberLabel={t("memberShort")} pricing={pricingOf(experience)} t2={t2} budget={restaurantBudget(experience)} />
          </p>
          {session ? (
            <p className="flex items-center gap-1.5 text-sm text-ink/80">
              <Users className="size-4" aria-hidden />
              {full ? t("waitlist") : await groupLabel(experience, session)}
            </p>
          ) : experience.ratingCount > 0 ? (
            <p className="flex items-center gap-1 text-sm font-medium text-ink/80">
              <Star className="size-4 fill-current text-brand-700" aria-hidden />
              {experience.ratingAvg.toFixed(1)} <span className="text-muted">({experience.ratingCount})</span>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
