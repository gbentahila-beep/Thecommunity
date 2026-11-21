import { experienceBadge, formatMoney, LOW_SEATS_THRESHOLD, seatsAvailable, type Experience, type Session } from "@thecommunity/shared";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { getCategory, getHomeSettings } from "@/lib/data";
import { formatShortSlot, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { groupLabel } from "./experience-card";

/**
 * Ligne du catalogue en vue « agenda » : vignette, titre (+ badges), heure · quartier · groupe, univers · langues · prix,
 * et un bouton « Réserver » (ou « Demander » / « Liste d'attente »). Toute la ligne ouvre la fiche.
 */
export async function ExperienceRow({ experience, session, showDay = false, priority = false }: { experience: Experience; session: Session; showDay?: boolean; priority?: boolean }) {
  const [locale, t, tl, tr2, category, home] = await Promise.all([
    getLocale(),
    getTranslations("card"),
    getTranslations("labels.languages"),
    getTranslations("catalogRow"),
    getCategory(experience.categoryId),
    getHomeSettings(),
  ]);
  const lang = locale as "fr" | "ar" | "en";
  const left = seatsAvailable(session);
  const full = session.status === "full" || left === 0;
  const badge = full ? null : experienceBadge(experience, session, new Date(), home.featuredExperienceIds);
  const cover = experience.images[0];
  const price = session.price ?? experience.price;
  const languages = experience.languages.slice(0, 2).map((l) => (tl.has(l) ? tl(l) : l)).join(", ");
  const action = full ? tr2("waitlist") : experience.admission === "on_request" ? tr2("request") : tr2("book");
  const pill = "rounded-full px-2.5 py-0.5 text-[12px] font-semibold";
  return (
    <article className="group relative flex items-center gap-4 py-4" data-testid="catalog-row">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-cream-deep sm:size-24">
        {cover && <Image src={cover.path} alt={tr(cover.alt, locale)} fill priority={priority} sizes="96px" className="object-cover transition duration-500 group-hover:scale-[1.05]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-[17px] leading-snug font-semibold text-ink">
            <Link href={`/experiences/${experience.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-plum-700">
              {tr(experience.title, locale)}
            </Link>
          </h3>
          {/* Un seul badge par ligne (le plus utile) : la liste reste compacte. */}
          {experience.audience === "women" ? (
            <span className={`${pill} bg-plum-100 text-plum-900`} data-testid="card-women">{t("women")}</span>
          ) : full ? (
            <span className={`${pill} bg-ink/80 text-white`}>{t("full")}</span>
          ) : left <= LOW_SEATS_THRESHOLD ? (
            <span className={`${pill} bg-white text-plum-800 ring-1 ring-plum-200`}>{t("lastSeats", { count: left })}</span>
          ) : badge ? (
            <span className={`${pill} ${badge === "featured" ? "bg-plum-900 text-white" : "bg-badge text-plum-900"}`} data-testid="card-badge">{t(`badge_${badge}`)}</span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-[15px] text-ink/80">
          {showDay ? formatShortSlot(session.startAt, locale) : formatTime(session.startAt, locale)} · {experience.district} · {await groupLabel(experience, session)}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">
          {category ? tr(category.shortName, locale) : ""}
          {languages && ` · ${languages}`} · <span className="font-medium text-ink/75">{formatMoney(price, lang)}</span>
        </p>
      </div>
      <Link
        href={`/reserver/${session.id}`}
        className="relative z-10 shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold sm:px-4 sm:text-sm text-ink shadow-card ring-1 ring-line transition hover:bg-plum-900 hover:text-white hover:ring-plum-900 inline-flex max-[359px]:hidden"
        aria-label={`${action} : ${tr(experience.title, locale)}`}
      >
        {action}
      </Link>
    </article>
  );
}
