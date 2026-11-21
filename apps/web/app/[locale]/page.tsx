import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AudienceCards, ClosingCta } from "@/components/audience-cards";
import { CompactRow } from "@/components/compact-row";
import { ThisWeek } from "@/components/home/this-week";
import { HomeFaq } from "@/components/home/home-faq";
import { HowItWorks } from "@/components/home/how-it-works";
import { ReviewsShowcase } from "@/components/home/reviews-showcase";
import { Universes } from "@/components/home/universes";
import { PageShell, PrimaryLink, SectionHeading } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { experienceBadge, NEW_EXPERIENCE_DAYS, type Experience, type HomeSectionId, type Session } from "@thecommunity/shared";
import { getCategories, getCities, getCity, getExperiencesWithoutUpcoming, getHomeSettings, getNextSessionPerExperience, getPublishedExperiences, getReviews } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, city, categories, reviews, cities, home, upcomingAll, undated, published, weekend] = await Promise.all([
    getTranslations("home"),
    getCity(DEFAULT_CITY),
    getCategories(),
    getReviews(),
    getCities(),
    getHomeSettings(),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY }),
    getExperiencesWithoutUpcoming({ cityId: DEFAULT_CITY }),
    getPublishedExperiences(),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY, when: "weekend" }),
  ]);
  const cityName = city ? tr(city.name, locale) : "";
  const trustOn = home.sections.some((x) => x.id === "trust" && x.enabled);
  // Étape 23 : sections de l'accueil choisies et ordonnées par l'équipe (Back-office → Accueil).
  const now = new Date();
  const nextOf = new Map(upcomingAll.map((x) => [x.experienceId, x]));
  const entry = (e: Experience): { experience: Experience; session?: Session } => ({ experience: e, session: nextOf.get(e.id) });
  const byId = new Map(published.map((e) => [e.id, e]));
  const picks = home.featuredExperienceIds.flatMap((id) => (byId.has(id) ? [entry(byId.get(id)!)] : []));
  const cityExps = [...upcomingAll.map((x) => x.experience), ...undated];
  const fresh = cityExps
    .filter((e) => e.createdAt && now.getTime() - Date.parse(e.createdAt) < NEW_EXPERIENCE_DAYS * 86_400_000)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 4)
    .map(entry);
  const popular = cityExps
    .filter((e) => experienceBadge(e, nextOf.get(e.id), now) === "popular")
    .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
    .slice(0, 4)
    .map(entry);
  // Sections secondaires (mises en avant, week-end, nouveautés…) : même liste compacte que « Cette semaine ».
  const cards = (id: string, title: string, items: { experience: Experience; session?: Session }[]) => {
    const dated = items.filter((x): x is { experience: Experience; session: Session } => Boolean(x.session));
    return (
      dated.length > 0 && (
        <PageShell key={id} className="max-w-3xl space-y-5 py-8" data-testid={`home-${id}`}>
          <SectionHeading title={title} action={{ href: "/experiences", label: t("seeAll") }} />
          <ul className="card divide-y divide-line/70 overflow-hidden">
            {dated.map((x) => (
              <li key={x.experience.id}>
                <CompactRow experience={x.experience} session={x.session} />
              </li>
            ))}
          </ul>
        </PageShell>
      )
    );
  };
  const banner = home.banner?.enabled ? home.banner : null;

  const sectionsById: Record<HomeSectionId, React.ReactNode> = {
    featured: cards("featured", t("featuredTitle"), picks),
    weekend: cards("weekend", t("weekendTitle", { city: cityName }), weekend.slice(0, 4).map((x) => ({ experience: x.experience, session: x }))),
    new: cards("new", t("newTitle"), fresh),
    popular: cards("popular", t("popularTitle"), popular),
    thisWeek: (
      <PageShell key="thisWeek" className="max-w-3xl py-8">
        <ThisWeek limit={6} />
      </PageShell>
    ),
    // L'encadré de confiance est affiché sous le bouton « Découvrir les expériences » (voir plus bas).
    trust: null,
    how: (
      <PageShell key="how">
        <HowItWorks categories={categories} />
      </PageShell>
    ),
    universes: (
      <PageShell key="universes">
        <Universes categories={categories} />
      </PageShell>
    ),
    reviews: reviews.length > 0 && (
        <PageShell key="reviews">
          <ReviewsShowcase
            reviews={reviews.slice(0, 3).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, publicName: r.publicName }))}
            title={t("reviewsTitle")}
            subtitle={t("reviewsSubtitle")}
            photoAlt={t("reviewsPhotoAlt")}
            prevLabel={t("reviewsPrev")}
            nextLabel={t("reviewsNext")}
          />
        </PageShell>
      ),
    cities: (
      <PageShell key="cities" className="pb-8">
        <div id="villes" className="scroll-mt-24 rounded-3xl bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl font-medium sm:text-4xl">{t("citiesTitle")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-plum-100">{t("citiesText")}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {cities.map((c) => (
              <li
                key={c.id}
                className={`rounded-full px-4 py-2 text-sm ${c.isActive ? "bg-white font-semibold text-plum-900" : "border border-white/25 text-plum-100"}`}
              >
                {tr(c.name, locale)}
              </li>
            ))}
          </ul>
        </div>
      </PageShell>
    ),
    faq: (
      <PageShell key="faq">
        <HomeFaq />
        <div className="mx-auto max-w-4xl">
          <AudienceCards />
        </div>
        <ClosingCta />
      </PageShell>
    ),
  };

  return (
    <>
      {banner && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8" data-testid="home-banner">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-plum-900 px-5 py-3 text-center text-sm text-white">
            <span>{tr(banner.text, locale)}</span>
            {banner.href && banner.linkLabel && (
              banner.href.startsWith("/") ? (
                <Link href={banner.href} className="font-semibold underline underline-offset-4">{tr(banner.linkLabel, locale)}</Link>
              ) : (
                <a href={banner.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">{tr(banner.linkLabel, locale)}</a>
              )
            )}
          </p>
        </div>
      )}
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <div className="relative z-10 order-2 px-4 pb-10 pt-8 sm:px-6 lg:order-1 lg:px-0 lg:py-24">
            <h1 className="animate-fade-up font-display text-[2.75rem] leading-[1.02] font-medium tracking-tight text-plum-900 sm:text-6xl lg:text-[4.25rem]">
              {t("heroTitle1")}
              <br />
              {t("heroTitle2")}
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink/80 [animation-delay:120ms] animate-fade-up">{t("heroSubtitle")}</p>
            <div className="mt-8 [animation-delay:220ms] animate-fade-up">
              <PrimaryLink href="/experiences">{t("heroCta")}</PrimaryLink>
            </div>
            {trustOn && (
              <ul className="mt-8 max-w-md space-y-3 rounded-3xl bg-cream-deep p-5 [animation-delay:300ms] animate-fade-up" data-testid="home-trust">
                {[
                  { icon: Users, label: t("trust1") },
                  { icon: HeartHandshake, label: t("trust2") },
                  { icon: ShieldCheck, label: t("trust3") },
                ].map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3">
                    <Icon className="size-6 shrink-0 text-plum-900" strokeWidth={1.5} aria-hidden />
                    <span className="text-[15px] leading-snug text-ink">{label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="relative order-1 h-[46vh] min-h-72 lg:order-2 lg:h-auto lg:min-h-[520px]">
            <Image
              src="/images/accueil-table-casablanca.webp"
              alt={t("heroImageAlt")}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover object-[45%_center] lg:rounded-b-[2rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/0 to-transparent lg:bg-gradient-to-r lg:from-cream lg:via-cream/10 rtl:lg:bg-gradient-to-l" />
          </div>
        </div>
      </section>

      {/* « Cette semaine » vient toujours juste après l'accroche ; les autres sections suivent l'ordre du back-office. */}
      {home.sections.some((x) => x.id === "thisWeek" && x.enabled) && sectionsById.thisWeek}
      {home.sections.filter((x) => x.enabled && x.id !== "thisWeek").map((x) => sectionsById[x.id])}
    </>
  );
}
