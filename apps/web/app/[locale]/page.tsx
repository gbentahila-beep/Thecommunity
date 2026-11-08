import { CalendarCheck, ShieldCheck, Users } from "lucide-react";
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
import { getCategories, getCities, getCity, getNextSessionPerExperience, getReviews } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, city, sessions, categories, reviews, cities] = await Promise.all([
    getTranslations("home"),
    getCity(DEFAULT_CITY),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY, when: "week" }),
    getCategories(),
    getReviews(),
    getCities(),
  ]);
  const cityName = city ? tr(city.name, locale) : "";
  // Si la semaine est calme, on complète avec les prochaines dates.
  const pool = sessions.length >= 4 ? sessions : await getNextSessionPerExperience({ cityId: DEFAULT_CITY });
  // Mises en avant d'abord, sessions complètes en dernier, puis ordre chronologique.
  const featured = [...pool]
    .sort(
      (a, b) =>
        Number(b.isFeatured) - Number(a.isFeatured) ||
        Number(a.status === "full") - Number(b.status === "full") ||
        a.startAt.localeCompare(b.startAt),
    )
    .slice(0, 4);

  return (
    <>
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

      {/* CATÉGORIES + CETTE SEMAINE */}
      <PageShell className="space-y-8 py-6">
        <div className="flex justify-center sm:hidden">
          <CityMenu />
        </div>
        <CategoryChips hrefFor={(id) => (id ? `/${DEFAULT_CITY}/${id}` : "/experiences")} />
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

      {/* RÉASSURANCE */}
      <PageShell className="py-6">
        <ul className="grid gap-4 rounded-[var(--radius-card)] bg-cream-deep p-6 sm:grid-cols-3 sm:p-8">
          {[
            { icon: Users, label: t("trust1") },
            { icon: ShieldCheck, label: t("trust2") },
            { icon: CalendarCheck, label: t("trust3") },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-4">
              <Icon className="size-8 shrink-0 text-plum-900" strokeWidth={1.5} aria-hidden />
              <span className="text-[15px] text-ink">{label}</span>
            </li>
          ))}
        </ul>
      </PageShell>

      {/* COMMENT ÇA MARCHE */}
      <PageShell>
        <HowItWorks categories={categories} />
      </PageShell>

      {/* UNIVERS */}
      <PageShell>
        <Universes categories={categories} />
      </PageShell>

      {/* POURQUOI VENIR */}
      {reviews.length > 0 && (
        <PageShell>
          <ReviewsShowcase
            reviews={reviews.slice(0, 3).map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, publicName: r.publicName }))}
            title={t("reviewsTitle")}
            subtitle={t("reviewsSubtitle")}
            photoAlt={t("reviewsPhotoAlt")}
            prevLabel={t("reviewsPrev")}
            nextLabel={t("reviewsNext")}
          />
        </PageShell>
      )}

      {/* VILLES */}
      <PageShell className="pb-8">
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

      {/* FAQ + CENTRE D'AIDE */}
      <PageShell>
        <HomeFaq />
      </PageShell>
    </>
  );
}
