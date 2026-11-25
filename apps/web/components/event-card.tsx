import { experienceBadge, LOW_SEATS_THRESHOLD, NEW_EXPERIENCE_DAYS, seatsAvailable, type Experience, type Session } from "@thecommunity/shared";
import { Gem } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { formatDaySlot, formatShortSlot, formatTime } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { TIER_TEXT } from "./card-pills";
import { groupLabel } from "./experience-card";

/** Les deux seuls repères affichés sur une carte (audit du 25/11, étape 2). */
type CardBadge = "new" | "almostFull";

const BADGE_TONE: Record<CardBadge, string> = {
  new: "bg-ink text-white",
  almostFull: "bg-coral text-ink",
};

/**
 * Carte « rendez-vous » unique (étape 2, docs/29), la même sur l'accueil, Découvrir, l'espace membre, la fiche
 * (« Dans le même esprit ») et la page d'un organisateur.
 * - Téléphone (et listes de 1 ou 2) : une ligne, vignette à gauche, informations sur des lignes entières (rien n'est coupé).
 * - Ordinateur, dès 3 rendez-vous : carte photo (règles `.event-list` dans globals.css).
 * Toute la carte ouvre la fiche ; plus de bouton « Réserver » : à la place, l'état des places (« 4 places »,
 * « Plus que 2 places », « Sur demande », « Complet · liste d'attente »). Une date complète est grisée.
 * Repères : « Nouveau » et « Dernières places » seulement ; les mises en avant du back-office (coup de cœur, populaire,
 * édition spéciale) servent aux sections de l'accueil, plus aux cartes.
 */
export async function EventCard({
  experience,
  session,
  when = "day",
  priority = false,
  anchorId,
  testId,
}: {
  experience: Experience;
  session?: Session;
  /** « day » : jour et heure ; « time » : l'heure seule (Découvrir, sous le titre du jour) ; « short » : jour court. */
  when?: "day" | "time" | "short";
  priority?: boolean;
  anchorId?: string;
  testId: string;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations("card")]);
  const left = session ? seatsAvailable(session) : Infinity;
  const full = session ? session.status === "full" || left === 0 : false;
  const low = !full && left <= LOW_SEATS_THRESHOLD;
  const now = new Date();
  const isNew =
    experience.highlight === "new" ||
    ((experience.highlight ?? "auto") === "auto" && !!experience.createdAt && now.getTime() - Date.parse(experience.createdAt) < NEW_EXPERIENCE_DAYS * 86_400_000);
  const auto = full || experience.highlight === "none" ? null : experienceBadge(experience, session, now);
  const badge: CardBadge | null = full || experience.highlight === "none" ? null : low || auto === "almostFull" ? "almostFull" : isNew ? "new" : null;
  const cover = experience.images[0];
  const title = session?.rendezvousTitle ? tr(session.rendezvousTitle, locale) : tr(experience.title, locale);
  // docs/25 : un rendez-vous réunit ses gammes sur une seule ligne (Casual · Premium · Exclusive).
  const tiers = session?.rendezvousTiers?.length ? session.rendezvousTiers : experience.venueTier ? [experience.venueTier] : [];
  const tp = await getTranslations("twoPart");
  const status = !session
    ? t("datesSoon")
    : full
      ? t("fullWaitlist")
      : low
        ? t("lastSeats", { count: left })
        : experience.admission === "on_request"
          ? t("onRequest")
          : t("seats", { count: left });
  const place = [experience.district, session ? await groupLabel(experience, session) : ""].filter(Boolean).join(" · ");

  return (
    <article
      id={anchorId}
      className={`ev-row group relative flex items-center gap-4 px-4 py-4 transition hover:bg-cream/50 ${anchorId ? "scroll-mt-56 lg:scroll-mt-48" : ""}`}
      data-testid={testId}
      data-full={full || undefined}
    >
      {/* Téléphone : vignette de 72 px ; ordinateur (grille) : photo en haut de la carte, repère posé dessus. */}
      <div className="ev-thumb-wrap relative shrink-0">
        <div className="ev-thumb relative size-18 overflow-hidden rounded-xl bg-cream-deep">
          {cover && (
            <Image
              src={cover.path}
              alt={tr(cover.alt, locale)}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 320px, 72px"
              className={`ev-img object-cover transition duration-500 ${full ? "grayscale" : ""}`}
            />
          )}
        </div>
        {badge && (
          <span aria-hidden className={`ev-photo-badge pointer-events-none absolute start-3 top-3 z-10 hidden rounded-md px-2 py-1 text-[11px] font-bold tracking-[0.05em] uppercase ${BADGE_TONE[badge]}`}>
            {t(`badge_${badge}`)}
          </span>
        )}
      </div>

      <div className="ev-text min-w-0 flex-1">
        {badge && (
          <span className={`ev-badge-inline mb-1 inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-[0.05em] uppercase ${BADGE_TONE[badge]}`} data-testid="card-badge">
            {t(`badge_${badge}`)}
          </span>
        )}
        <h3 className={`line-clamp-2 text-[15px] leading-snug font-semibold ${full ? "text-ink/60" : "text-ink"}`}>
          <Link
            href={`/experiences/${experience.slug}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-brand-700"
          >
            {title}
          </Link>
        </h3>
        {session && (
          <p className="mt-1 text-[13px] text-ink/80">
            {when === "time" ? (
              <>
                {/* Découvrir : l'heure seule sous le titre du jour ; le jour aussi dans la grille d'ordinateur. */}
                <span className="ev-when-long hidden">{formatShortSlot(session.startAt, locale)}</span>
                <span className="ev-when-short">{formatTime(session.startAt, locale)}</span>
              </>
            ) : when === "short" ? (
              formatShortSlot(session.startAt, locale)
            ) : (
              formatDaySlot(session.startAt, locale)
            )}
          </p>
        )}
        {place && <p className="text-[13px] text-muted">{place}</p>}
        {(experience.audience === "women" || tiers.length > 0) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted">
            {experience.audience === "women" && (
              <span className="font-semibold text-rose-700" data-testid="card-women">
                {t("women")}
              </span>
            )}
            {tiers.map((tier, i) => (
              <span key={tier} className={`inline-flex items-center gap-0.5 font-semibold ${TIER_TEXT[tier]}`} data-testid="card-tier">
                {(i > 0 || experience.audience === "women") && <span className="me-1 font-normal text-muted">·</span>}
                {tier !== "casual" && <Gem className="size-3" aria-hidden />}
                {tp(`tier_${tier}`)}
              </span>
            ))}
          </p>
        )}
        {/* À la place du bouton : l'état des places, sous le texte (rien n'est écrasé sur téléphone), en bas de la carte sur la grille. */}
        <div className="ev-status-wrap mt-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap ${
              full ? "bg-cream-deep text-muted" : low ? "bg-coral/15 text-[#b8381f]" : "bg-cream text-ink"
            }`}
            data-testid="card-status"
          >
            {status}
          </span>
        </div>
      </div>

    </article>
  );
}
