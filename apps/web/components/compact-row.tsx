import {
  experienceBadge,
  seatsAvailable,
  type Experience,
  type Session,
} from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getCategory, getHomeSettings } from "@/lib/data";
import { formatDaySlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { groupLabel } from "./experience-card";
import { Gem } from "lucide-react";
import { CornerRibbon } from "./corner-ribbon";
import { TIER_TEXT } from "./card-pills";

/**
 * Ligne compacte d'une expérience (accueil, tableau de bord, « Déjà vécues ») : vignette, titre + badge, jour et heure
 * (ou « Prochaines dates bientôt » sans date),
 * quartier · groupe, univers ; prix à droite. Toute la ligne ouvre la fiche.
 */
export async function CompactRow({
  experience,
  session,
  priority = false,
}: {
  experience: Experience;
  session?: Session;
  priority?: boolean;
}) {
  const [locale, t, category, home, tp, subcategory, tr2] = await Promise.all([
    getLocale(),
    getTranslations("card"),
    getCategory(experience.categoryId),
    getHomeSettings(),
    getTranslations("twoPart"),
    experience.subcategoryId
      ? getCategory(experience.subcategoryId)
      : Promise.resolve(null),
    getTranslations("catalogRow"),
  ]);
  const full = session
    ? session.status === "full" || seatsAvailable(session) === 0
    : false;
  const badge = full
    ? null
    : experienceBadge(
        experience,
        session,
        new Date(),
        home.featuredExperienceIds,
      );
  const cover = experience.images[0];
  const formatFull = subcategory
    ? tr(subcategory.shortName, locale)
    : category
      ? tr(category.shortName, locale)
      : "";
  const formatName =
    formatFull &&
    tr(experience.title, locale)
      .toLowerCase()
      .startsWith(formatFull.toLowerCase())
      ? ""
      : formatFull;
  // Étape X : un bouton d'action à droite (comme dans Découvrir) ; le prix passe sur la ligne de la gamme.
  const action = !session
    ? tr2("alert")
    : full
      ? tr2("waitlist")
      : experience.admission === "on_request"
        ? tr2("request")
        : tr2("book");
  return (
    <article
      className="ev-row group relative flex gap-3.5 px-4 py-3.5"
      data-testid="compact-row"
    >
      {/* Téléphone : vignette de 64 px ; ordinateur : photo en haut de la carte. */}
      <div className="ev-thumb-wrap relative shrink-0">
        <div className="ev-thumb relative size-16 overflow-hidden rounded-xl bg-cream-deep">
          {cover && (
            <Image
              src={cover.path}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 320px, 64px"
              className="ev-img object-cover transition duration-500"
            />
          )}
        </div>
        {badge && <CornerRibbon badge={badge} label={t(`badge_${badge}`)} />}
      </div>
      {/* Étape X : texte à gauche, bouton « Réserver » à droite (le prix est sur la dernière ligne). */}
      <div className="ev-body flex min-w-0 flex-1 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="min-w-0 text-[15px] leading-snug font-semibold text-ink">
            <Link
              href={`/experiences/${experience.slug}`}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-brand-700"
            >
              {tr(experience.title, locale)}
            </Link>
          </h3>
          <p className="mt-0.5 text-[13px] text-ink/80">
            {session ? formatDaySlot(session.startAt, locale) : t("datesSoon")}
          </p>
          <p className="truncate text-[13px] text-muted">
            {[
              experience.district,
              session ? await groupLabel(experience, session) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {/* Étape Q : format, gamme et public en une ligne de texte (plus de pastilles) ; le badge est sur la photo. */}
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {experience.audience === "women" && (
              <span className="font-semibold text-rose-700">
                {t("women")} ·{" "}
              </span>
            )}
            {/* Le format n'est pas répété s'il ouvre déjà le titre (« Dîner Premium »). */}
            {formatName}
            {experience.venueTier && (
              <>
                {formatName ? " · " : ""}
                <span
                  className={`inline-flex items-center gap-0.5 font-semibold ${TIER_TEXT[experience.venueTier]}`}
                  data-testid="tier-pill"
                >
                  {experience.venueTier !== "casual" && (
                    <Gem className="size-3" aria-hidden />
                  )}
                  {tp(`tier_${experience.venueTier}`)}
                </span>
              </>
            )}
            {/* Le prix n'est pas sur la ligne : il est sur la fiche et à la réservation. */}
            {full && (
              <span className="font-semibold text-ink">{formatName || experience.venueTier ? " · " : ""}{t("full")}</span>
            )}
          </p>
        </div>
        <Link
          href={session ? `/reserver/${session.id}` : `/experiences/${experience.slug}#alerte`}
          className="relative z-10 inline-flex shrink-0 self-center rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-card ring-1 ring-line transition hover:bg-brand-700 hover:text-white hover:ring-brand-700 max-[359px]:hidden ev-cta"
          aria-label={`${action} : ${tr(experience.title, locale)}`}
        >
          {action}
        </Link>
      </div>
    </article>
  );
}
