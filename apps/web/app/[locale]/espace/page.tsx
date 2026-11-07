import { ArrowRight, Star, Users } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { ExperienceCard } from "@/components/experience-card";
import { ReservationCard } from "@/components/account/reservation-card";
import { PrimaryLink } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getNextSessionPerExperience } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { formatLongDate, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

const INTEREST_TO_CATEGORY: Record<string, string[]> = {
  gastronomy: ["eat"], sport: ["move"], wellness: ["move"], games: ["play"], art: ["create"],
  culture: ["create", "discover"], music: ["discover", "play"], nightlife: ["discover"], discovery: ["discover"], travel: ["discover"],
};

export default async function DashboardPage({ params }: PageProps<"/[locale]/espace">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, loc, space] = await Promise.all([getTranslations("account"), getLocale(), getMemberSpace()]);
  const next = space.upcoming[0];
  const days = next ? Math.max(0, Math.floor((new Date(next.sessionSnapshot.startAt).getTime() - space.now.getTime()) / 86_400_000)) : 0;
  const bookedExperienceIds = new Set(space.reservations.map((r) => r.experienceId));
  const wanted = new Set(space.profile.interests.flatMap((i) => INTEREST_TO_CATEGORY[i] ?? []));
  const recommended = (await getNextSessionPerExperience({ cityId: space.profile.cityId }))
    .filter((s) => !bookedExperienceIds.has(s.experienceId) && wanted.has(s.categoryId) && s.status !== "full")
    .slice(0, 3);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("hello", { name: space.profile.firstName })}</h1>
        <p className="mt-1 text-muted">
          {t("helloSubtitle")} · {t("stats", { count: space.past.length })}
        </p>
      </header>

      <section aria-labelledby="next-title">
        <h2 id="next-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("nextExperience")}</h2>
        {next ? (
          <article className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-float sm:flex">
            <div className="relative h-48 sm:h-auto sm:w-72 sm:shrink-0">
              <Image src={next.sessionSnapshot.coverImagePath} alt="" fill sizes="(min-width: 640px) 288px, 100vw" className="object-cover" priority />
              <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-plum-900">
                {t("inDays", { days })}
              </span>
            </div>
            <div className="space-y-3 p-5">
              <h3 className="font-display text-2xl font-medium text-plum-900">{tr(next.sessionSnapshot.title, loc)}</h3>
              <p className="text-muted">
                {formatLongDate(next.sessionSnapshot.startAt, loc)} · {formatTimeRange(next.sessionSnapshot.startAt, next.sessionSnapshot.endAt, loc)} · {next.sessionSnapshot.district}
              </p>
              {(next.sessionSnapshot.bookingMode === "social_dinner" || next.sessionSnapshot.bookingMode === "group") && (
                <p className="flex items-center gap-2 rounded-xl bg-plum-50 px-3 py-2 text-sm text-plum-900">
                  <Users className="size-4 shrink-0" aria-hidden />
                  {next.groupId ? t("groupRevealed") : t("groupPending")}
                </p>
              )}
              <Link href={`/espace/reservations/${next.id}`} className="group inline-flex items-center gap-1.5 font-semibold text-plum-900">
                {t("seeDetails")}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            </div>
          </article>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center">
            <p className="text-muted">{t("noUpcoming")}</p>
            <PrimaryLink href="/experiences" className="mt-4">{t("findExperience")}</PrimaryLink>
          </div>
        )}
        {space.upcoming.length > 1 && (
          <div className="mt-4 space-y-3">
            {space.upcoming.slice(1).map((r) => <ReservationCard key={r.id} reservation={r} />)}
          </div>
        )}
      </section>

      {space.toReview.length > 0 && (
        <section aria-labelledby="review-title">
          <h2 id="review-title" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{t("toReview")}</h2>
          <ul className="space-y-3">
            {space.toReview.map((r) => (
              <li key={r.id} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white/70 p-4">
                <Star className="size-6 shrink-0 text-plum-700" aria-hidden />
                <p className="flex-1 text-ink">{t("toReviewText", { title: tr(r.sessionSnapshot.title, loc) })}</p>
                <Link href={`/espace/reservations/${r.id}#avis`} className="shrink-0 rounded-full bg-plum-900 px-4 py-2 text-sm font-semibold text-white">
                  {t("giveReview")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recommended.length > 0 && (
        <section aria-labelledby="reco-title" className="space-y-4">
          <div>
            <h2 id="reco-title" className="font-display text-2xl font-medium text-plum-900">{t("recommended")}</h2>
            <p className="text-sm text-muted">{t("recommendedText")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map((s) => <ExperienceCard key={s.id} session={s} experience={s.experience} />)}
          </div>
        </section>
      )}
    </div>
  );
}
