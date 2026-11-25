import { ArrowRight, Star, Users } from "lucide-react";
import { MediaImage as Image } from "@/components/media";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ThisWeek } from "@/components/home/this-week";
import { UniverseGrid } from "@/components/home/universes";
import { ReservationCard } from "@/components/account/reservation-card";
import { Link } from "@/i18n/navigation";
import { isMemberActive, recommendFor } from "@thecommunity/shared";
import { CompactRow } from "@/components/compact-row";
import { EmptyState } from "@/components/empty-state";
import { BabLineup } from "@/components/brand/bab-lineup";
import { getCategories, getCities, getMembershipPlan, getNextSessionPerExperience } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";


export default async function DashboardPage({ params }: PageProps<"/[locale]/espace">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, te, tb, loc, space, plan, categories, cities] = await Promise.all([getTranslations("account"), getTranslations("emptyStates"), getTranslations("babs"), getLocale(), getMemberSpace(), getMembershipPlan(), getCategories(), getCities()]);
  // La ville du membre si elle est ouverte, sinon la ville par défaut.
  const cityId = cities.find((c) => c.id === space.profile.cityId && c.isActive)?.id ?? DEFAULT_CITY;
  // Étape 30 : univers préférés, centres d'intérêt, quartier ; jamais déjà réservé ni réservé aux femmes pour qui ne l'est pas.
  const booked = new Set(space.reservations.map((r) => r.experienceId));
  const recommended = recommendFor(space.profile, await getNextSessionPerExperience({ cityId }), { exclude: booked, limit: 3 });
  // Étape 28 : l'abonnement est proposé APRÈS une première expérience (plus mis en avant avant).
  const suggestMembership = Boolean(plan) && space.past.length > 0 && !isMemberActive(space.membership ?? null, space.now);
  const next = space.upcoming[0];
  const days = next ? Math.max(0, Math.floor((new Date(next.sessionSnapshot.startAt).getTime() - space.now.getTime()) / 86_400_000)) : 0;

  return (
    <div className="space-y-12" data-testid="member-home">
      <header>
        <h1 className="page-title">{t("hello", { name: space.profile.firstName })}</h1>

      </header>

      {!next && (
        <EmptyState bab="wen" mood="sleep" prop="calendar" titleAs="h2" title={te("upcomingTitle")} text={te("upcomingText")} action={{ href: "/experiences", label: te("browse") }} data-testid="upcoming-empty" />
      )}

      {next && (
      <section aria-labelledby="next-title">
        <h2 id="next-title" className="section-title mb-4">{t("nextExperience")}</h2>
        {next ? (
          <article className="overflow-hidden card sm:flex">
            <div className="relative h-48 sm:h-auto sm:w-72 sm:shrink-0">
              <Image src={next.sessionSnapshot.coverImagePath} alt="" fill sizes="(min-width: 640px) 288px, 100vw" className="object-cover" priority />
              <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-brand-900">
                {t("inDays", { days })}
              </span>
            </div>
            <div className="space-y-3 p-5">
              <h3 className="card-title">{tr(next.sessionSnapshot.title, loc)}</h3>
              <p className="text-muted">
                {formatLongDate(next.sessionSnapshot.startAt, loc)} · {formatTimeRange(next.sessionSnapshot.startAt, next.sessionSnapshot.endAt, loc)}{next.venue?.name ? ` · ${next.venue.name}` : ""}
              </p>
              {(next.sessionSnapshot.bookingMode === "social_dinner" || next.sessionSnapshot.bookingMode === "group") && (
                <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
                  <Users className="size-4 shrink-0" aria-hidden />
                  {next.groupId ? t("groupRevealed") : t("groupPending")}
                </p>
              )}
              <Link href={`/espace/reservations/${next.id}`} className="group inline-flex items-center gap-1.5 font-semibold text-brand-900">
                {t("seeDetails")}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </article>
        ) : null}
        {space.upcoming.length > 1 && (
          <div className="mt-4 space-y-3">
            {space.upcoming.slice(1, 3).map((r) => <ReservationCard key={r.id} reservation={r} />)}
          </div>
        )}
      </section>
      )}

      {space.toReview.length > 0 && (
        <section aria-labelledby="review-title">
          <h2 id="review-title" className="section-title mb-4">{t("toReview")}</h2>
          <ul className="space-y-3">
            {space.toReview.map((r) => (
              <li key={r.id} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white/70 p-4">
                <Star className="size-6 shrink-0 text-brand-700" aria-hidden />
                <p className="flex-1 text-ink">{t("toReviewText", { title: tr(r.sessionSnapshot.title, loc) })}</p>
                <Link href={`/espace/reservations/${r.id}#avis`} className="btn btn-primary btn-sm shrink-0">
                  {t("giveReview")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggestMembership && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-brand-50 p-5 text-ink ring-1 ring-brand-100 sm:flex-row sm:items-center" data-testid="membership-suggestion">
          <p className="flex-1">
            <span className="block font-display text-xl">{t("memberSuggestTitle")}</span>
            <span className="text-sm text-muted">{t("memberSuggestText")}</span>
          </p>
          <Link href="/abonnement" className="btn btn-primary btn-sm shrink-0">{t("memberSuggestCta")}</Link>
        </section>
      )}

      <BabLineup seatLabel={tb("seat")} caption={tb("caption")} className="pt-4" />

      <section aria-labelledby="universes-title" className="space-y-4">
        <div className="text-center">
          <h2 id="universes-title" className="section-title">{t("universesHeading")}</h2>
          <p className="text-sm text-muted">{t("universesText")}</p>
        </div>
        <UniverseGrid categories={categories} cityId={cityId} />
      </section>

      {recommended.length > 0 && (
        <section aria-labelledby="reco-title" className="space-y-4">
          <div className="text-center">
            <h2 id="reco-title" className="section-title">{t("recommended")}</h2>
            <p className="text-sm text-muted">{t("recommendedText")}</p>
          </div>
          <ul className={`event-list ${recommended.length < 3 ? "is-few" : ""}`}>
            {recommended.map((s) => (
              <li key={s.id}>
                <CompactRow experience={s.experience} session={s} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ThisWeek limit={15} cityId={cityId} />
    </div>
  );
}
