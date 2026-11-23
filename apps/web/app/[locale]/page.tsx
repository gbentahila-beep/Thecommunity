import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AudienceCards, ClosingCta } from "@/components/audience-cards";
import { CompactRow } from "@/components/compact-row";
import { ThisWeek } from "@/components/home/this-week";
import { Agenda } from "@/components/home/agenda";
import { AppPreview } from "@/components/home/app-preview";
import { HomeFaq } from "@/components/home/home-faq";
import { HowItWorks } from "@/components/home/how-it-works";
import { ReviewsShowcase } from "@/components/home/reviews-showcase";
import { Universes } from "@/components/home/universes";
import { PageShell, PrimaryLink, SectionHeading } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { Bab } from "@/components/brand/bab";
import { BabLineup } from "@/components/brand/bab-lineup";
import { experienceBadge, NEW_EXPERIENCE_DAYS, type Experience, type HomeSectionId, type Session } from "@thecommunity/shared";
import { getCategories, getCities, getCity, getExperiencesWithoutUpcoming, getHomeSettings, getNextSessionPerExperience, getPublishedExperiences, getReviews } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tb, city, categories, reviews, cities, home, upcomingAll, undated, published, weekend] = await Promise.all([
    getTranslations("home"),
    getTranslations("babs"),
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
      <PageShell key="thisWeek" className="max-w-3xl space-y-10 py-8">
        {/* docs/22 § 14 : agenda par semaine, puis la liste filtrable par univers. */}
        <Agenda />
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
        <div id="villes" className="scroll-mt-24 overflow-hidden rounded-3xl bg-night px-6 py-12 text-center text-white sm:px-12">
          <h2 className="font-display text-3xl sm:text-4xl">
            {t("citiesTitle")}
            <Bab name="scout" mood="big" className="ms-2 inline-block w-12 align-[-8px]" />
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/75">{t("citiesText")}</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {cities.map((c) => (
              <li
                key={c.id}
                className={`rounded-full px-4 py-2 text-sm ${c.isActive ? "bg-gradient-brand font-semibold text-ink" : "border border-white/20 text-cream/80"}`}
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
        <div className="mx-auto max-w-6xl pt-6">
          <AudienceCards withTitle />
        </div>
        <ClosingCta />
      </PageShell>
    ),
  };

  return (
    <>
      {banner && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8" data-testid="home-banner">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-brand-900 px-5 py-3 text-center text-sm text-white">
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
      {/* HERO : sur téléphone, la photo entière en haut et une carte crème posée sur son bas (option 2) ;
          sur ordinateur, la photo plein cadre avec le titre en blanc sur un voile sombre à gauche (option 1). */}
      <section className={`relative ${banner ? "mt-3" : "-mt-16"} lg:mt-0 lg:flex lg:h-[min(80vh,720px)] lg:min-h-[560px] lg:items-center`}>
        <div className="relative h-[50vh] min-h-[330px] max-h-[560px] lg:absolute lg:inset-0 lg:h-full lg:max-h-none">
          <Image
            src="/images/accueil-rooftop-casablanca.webp"
            alt={t("heroImageAlt")}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[45%_30%] lg:object-[60%_35%]"
          />
          <div className="absolute inset-0 hidden bg-gradient-to-r from-ink/80 via-ink/40 to-transparent lg:block rtl:bg-gradient-to-l" />
        </div>
        <div className="relative z-10 mx-3 -mt-24 rounded-[1.75rem] bg-cream p-5 shadow-float sm:mx-6 sm:p-7 lg:mx-auto lg:mt-0 lg:w-full lg:max-w-7xl lg:rounded-none lg:bg-transparent lg:px-8 lg:py-0 lg:shadow-none">
          <div className="lg:max-w-xl">
            <h1 className="animate-fade-up font-display text-[2.3rem] leading-[1] font-semibold tracking-[-0.025em] text-brand-900 sm:text-6xl lg:text-[4.5rem] lg:text-white">
              {t("heroTitle1")}
              <br />
              <span className="text-gradient lg:bg-[linear-gradient(100deg,#ff8a6b,#d98bf0)]">{t("heroTitle2")}</span>
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/75 [animation-delay:120ms] animate-fade-up lg:mt-5 lg:text-lg lg:text-white/85">{t("heroSubtitle")}</p>
            <div className="mt-5 [animation-delay:220ms] animate-fade-up lg:mt-8">
              <PrimaryLink href="/experiences" className="w-full lg:w-auto">{t("heroCta")}</PrimaryLink>
            </div>
          </div>
        </div>
      </section>
      <AppPreview />
      {trustOn && (
        <PageShell className="mt-14 lg:mt-16">
          <ul className="grid gap-3 rounded-3xl bg-cream-deep p-5 sm:grid-cols-3 sm:gap-6 sm:px-7 [animation-delay:300ms] animate-fade-up" data-testid="home-trust">
            {[
              { icon: Users, label: t("trust1") },
              { icon: HeartHandshake, label: t("trust2") },
              { icon: ShieldCheck, label: t("trust3") },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <Icon className="size-6 shrink-0 text-brand-900" strokeWidth={1.5} aria-hidden />
                <span className="text-[15px] leading-snug text-ink">{label}</span>
              </li>
            ))}
          </ul>
        </PageShell>
      )}

      {/* Lignée de Babs avec une place libre : sépare l'accroche de « Cette semaine ». */}
      <PageShell className="mt-16 sm:mt-20">
        <BabLineup seatLabel={tb("seat")} caption={tb("caption")} />
      </PageShell>

      {/* « Cette semaine » vient toujours juste après l'accroche ; les autres sections suivent l'ordre du back-office. */}
      {home.sections.some((x) => x.id === "thisWeek" && x.enabled) && sectionsById.thisWeek}
      {home.sections.filter((x) => x.enabled && x.id !== "thisWeek").map((x) => sectionsById[x.id])}
    </>
  );
}
