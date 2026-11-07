import { CalendarCheck, HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryChips } from "@/components/category-chips";
import { CategoryIcon } from "@/components/category-icon";
import { CityMenu } from "@/components/city-menu";
import { ExperienceCard } from "@/components/experience-card";
import { PageShell, PrimaryLink, SectionHeading, Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getCategories, getCities, getCity, getNextSessionPerExperience, getReviews } from "@/lib/data";
import { tr } from "@/lib/i18n-text";
import { CATEGORY_STYLES, DEFAULT_CITY } from "@/lib/site";

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
              className="object-cover lg:rounded-b-[2rem]"
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
      <PageShell className="py-16">
        <SectionHeading title={t("howTitle")} />
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            { icon: Sparkles, title: t("how1Title"), text: t("how1Text") },
            { icon: CalendarCheck, title: t("how2Title"), text: t("how2Text") },
            { icon: HeartHandshake, title: t("how3Title"), text: t("how3Text") },
          ].map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="relative rounded-[var(--radius-card)] border border-line bg-white/70 p-6">
              <span className="font-display text-5xl text-plum-100">{i + 1}</span>
              <Icon className="absolute end-6 top-6 size-7 text-plum-700" strokeWidth={1.5} aria-hidden />
              <h3 className="mt-2 text-lg font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-[15px] text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </PageShell>

      {/* UNIVERS */}
      <PageShell className="py-8">
        <SectionHeading title={t("universesTitle")} />
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {categories.map((c) => {
            const style = CATEGORY_STYLES[c.id];
            return (
              <li key={c.id}>
                <Link
                  href={`/${DEFAULT_CITY}/${c.id}`}
                  className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <span className={`grid size-12 place-items-center rounded-full ${style?.bg} ${style?.text}`}>
                    <CategoryIcon category={c.id} className="size-6" />
                  </span>
                  <span className="text-base font-semibold text-ink">{tr(c.name, locale)}</span>
                  <span className="text-sm text-muted">{tr(c.description, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </PageShell>

      {/* AVIS */}
      <PageShell className="py-16">
        <SectionHeading title={t("reviewsTitle")} />
        <ul className="-mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
          {reviews.slice(0, 3).map((r) => (
            <li key={r.id} className="w-[85%] shrink-0 snap-start rounded-[var(--radius-card)] bg-white p-6 shadow-card sm:w-auto">
              <Stars value={r.rating} />
              <blockquote className="mt-4 font-display text-lg leading-relaxed text-ink">« {r.comment} »</blockquote>
              <p className="mt-4 text-sm font-medium text-muted">{r.publicName}</p>
            </li>
          ))}
        </ul>
      </PageShell>

      {/* VILLES */}
      <PageShell className="pb-8">
        <div className="rounded-[2rem] bg-plum-900 px-6 py-12 text-center text-white sm:px-12">
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
    </>
  );
}
