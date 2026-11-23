import { experienceBadge, LOW_SEATS_THRESHOLD, seatsAvailable, type Experience, type Session } from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getCategory, getHomeSettings } from "@/lib/data";
import { formatShortSlot, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { groupLabel } from "./experience-card";
import { Gem } from "lucide-react";
import { CornerRibbon } from "./corner-ribbon";
import { TIER_TEXT } from "./card-pills";

/**
 * Ligne du catalogue en vue « agenda » : vignette, titre (+ badges), heure · quartier · groupe, univers · langues · prix,
 * et un bouton « Réserver » (ou « Demander » / « Liste d'attente »). Toute la ligne ouvre la fiche.
 */
/**
 * `agenda` : ligne d'un jour de Découvrir (l'heure seule sous le titre du jour ; le jour aussi dans la grille d'ordinateur).
 * `anchorId` : ancre du calendrier (« #jour-… »), posée sur la première ligne du jour.
 */
export async function ExperienceRow({ experience, session, showDay = false, priority = false, agenda = false, anchorId }: { experience: Experience; session?: Session; showDay?: boolean; priority?: boolean; agenda?: boolean; anchorId?: string }) {
  const [locale, t, tr2, category, home, tp, subcategory] = await Promise.all([
    getLocale(),
    getTranslations("card"),
    getTranslations("catalogRow"),
    getCategory(experience.categoryId),
    getHomeSettings(),
    getTranslations("twoPart"),
    experience.subcategoryId ? getCategory(experience.subcategoryId) : Promise.resolve(null),
  ]);
  // Sans date (« Déjà vécues ») : même ligne, « Prochaines dates bientôt » et un bouton « M'alerter » vers la fiche.
  const left = session ? seatsAvailable(session) : Infinity;
  const full = session ? session.status === "full" || left === 0 : false;
  const badge = full ? null : experienceBadge(experience, session, new Date(), home.featuredExperienceIds);
  const cover = experience.images[0];
  const formatFull = subcategory ? tr(subcategory.shortName, locale) : category ? tr(category.shortName, locale) : "";
  const formatName = formatFull && tr(experience.title, locale).toLowerCase().startsWith(formatFull.toLowerCase()) ? "" : formatFull;
  const action = !session ? tr2("alert") : full ? tr2("waitlist") : experience.admission === "on_request" ? tr2("request") : tr2("book");
  return (
    <article id={anchorId} className={`ev-row group relative flex items-center gap-3.5 px-4 py-3.5 ${anchorId ? "scroll-mt-56 lg:scroll-mt-48" : ""}`} data-testid="catalog-row">
      {/* Téléphone : vignette de 64 px ; ordinateur : photo en haut de la carte. */}
      <div className="ev-thumb-wrap relative shrink-0">
        <div className="ev-thumb relative size-16 overflow-hidden rounded-xl bg-cream-deep">
          {cover && <Image src={cover.path} alt={tr(cover.alt, locale)} fill priority={priority} sizes="(min-width: 1024px) 320px, 64px" className="ev-img object-cover transition duration-500" />}
        </div>
        {badge && <CornerRibbon badge={badge} label={t(`badge_${badge}`)} />}
      </div>
      <div className="ev-text min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[15px] leading-snug font-semibold text-ink">
            <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand-700">
              {tr(experience.title, locale)}
            </Link>
          </h3>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-ink/80">
          {session ? (
            <>
              {agenda && <span className="ev-when-long hidden">{formatShortSlot(session.startAt, locale)} · </span>}
              {agenda && <span className="ev-when-short">{formatTime(session.startAt, locale)} · </span>}
              {[agenda ? "" : showDay ? formatShortSlot(session.startAt, locale) : formatTime(session.startAt, locale), experience.district, await groupLabel(experience, session)].filter(Boolean).join(" · ")}
              {full ? <span className="font-semibold text-muted"> · {t("full")}</span> : left <= LOW_SEATS_THRESHOLD ? <span className="font-semibold text-brand-700"> · {t("lastSeats", { count: left })}</span> : null}
            </>
          ) : (
            <>
              {[t("datesSoon"), experience.district].filter(Boolean).join(" · ")}
            </>
          )}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {experience.audience === "women" && <span className="font-semibold text-rose-700" data-testid="card-women">{t("women")} · </span>}
          {/* Le format n'est pas répété s'il ouvre déjà le titre (« Dîner Premium »). */}
          {formatName}
          {experience.venueTier && (
            <>
              {formatName ? " · " : ""}
              <span className={`inline-flex items-center gap-0.5 font-semibold ${TIER_TEXT[experience.venueTier]}`} data-testid="card-tier">
                {experience.venueTier !== "casual" && <Gem className="size-3" aria-hidden />}
                {tp(`tier_${experience.venueTier}`)}
              </span>
            </>
          )}
          {/* Format et gamme ; le prix et les langues sont sur la fiche. */}
        </p>
      </div>
      <Link
        href={session ? `/reserver/${session.id}` : `/experiences/${experience.slug}#alerte`}
        className="relative z-10 inline-flex shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-card ring-1 ring-line transition hover:bg-brand-700 hover:text-white hover:ring-brand-700 max-[359px]:hidden ev-cta"
        aria-label={`${action} : ${tr(experience.title, locale)}`}
      >
        {action}
      </Link>
    </article>
  );
}
