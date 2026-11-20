import { HeartHandshake, ShieldCheck, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/category-chips";
import { CityMenu } from "@/components/city-menu";
import { ExperienceCard } from "@/components/experience-card";
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
  const [t, city, sessions, categories, reviews, cities, home, upcomingAll, undated, published, weekend] = await Promise.all([
    getTranslations("home"),
    getCity(DEFAULT_CITY),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY, when: "week" }),
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
  // Si la semaine est calme, on complète avec les prochaines dates.
  const pool = sessions.length >= 4 ? sessions : upcomingAll;
  // Mises en avant d'abord, sessions complètes en dernier, puis ordre chronologique.
  const featured = [...pool]
    .sort(
      (a, b) =>
        Number(b.isFeatured) - Number(a.isFeatured) ||
        Number(a.status === "full") - Number(b.status === "full") ||
        a.startAt.localeCompare(b.startAt),
    )
    .slice(0, 4);

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
  const cards = (id: string, title: string, items: { experience: Experience; session?: Session }[]) =>
    items.length > 0 && (
      <PageShell key={id} className="space-y-8 py-6" data-testid={`home-${id}`}>
        <SectionHeading title={title} action={{ href: "/experiences", label: t("seeAll") }} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((x) => <ExperienceCard key={x.experience.id} session={x.session} experience={x.experience} />)}
        </div>
      </PageShell>
    );
  const banner = home.banner?.enabled ? home.banner : null;

  const sectionsById: Record<HomeSectionId, React.ReactNode> = {
    featured: cards("featured", t("featuredTitle"), picks),
    weekend: cards("weekend", t("weekendTitle", { city: cityName }), weekend.slice(0, 4).map((x) => ({ experience: x.experience, session: x }))),
    new: cards("new", t("newTitle"), fresh),
    popular: cards("popular", t("popularTitle"), popular),
    thisWeek: (
      <PageShell key="thisWeek" className="space-y-8 py-6">
        <SectionHeading
          title={t("thisWeek", { city: cityName })}
          action={{ href: `/${DEFAULT_CITY}`, label: t("seeAll") }}
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featured.map((s, i) => (
            <ExperienceCard key={s.id} session={s} experience={s.experience} priority={i < 2} />
          ))}
        </div>
        <Link href={`/${DEFAULT_CITY}`} className="block text-center text-sm font-medium text-plum-900 underline underline-offset-4 sm:hidden">
          {t("seeAll")}
        </Link>
      </PageShell>
    ),
    trust: (
      <PageShell key="trust" className="py-6" data-testid="home-trust">
        <ul className="grid gap-4 rounded-[var(--radius-card)] bg-cream-deep p-6 sm:grid-cols-3 sm:p-8">
          {[
            { icon: Users, label: t("trust1") },
            { icon: HeartHandshake, label: t("trust2") },
            { icon: ShieldCheck, label: t("trust3") },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-4">
              <Icon className="size-8 shrink-0 text-plum-900" strokeWidth={1.5} aria-hidden />
              <span className="text-[15px] text-ink">{label}</span>
            </li>
          ))}
        </ul>
      </PageShell>
    ),
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
        <div id="villes" className="scroll-mt-24 rounded-[2rem] bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] px-6 py-12 text-center text-white sm:px-12">
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

      {/* CATÉGORIES */}
      <PageShell className="pt-6">
        <div className="mb-6 flex justify-center sm:hidden">
          <CityMenu />
        </div>
        <CategoryChips hrefFor={(id) => (id ? `/${DEFAULT_CITY}/${id}` : "/experiences")} />
      </PageShell>

      {home.sections.filter((x) => x.enabled).map((x) => sectionsById[x.id])}
    </>
  );
}
