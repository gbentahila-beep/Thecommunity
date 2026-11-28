import { CalendarDays, ChevronRight } from "lucide-react";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClosingCta } from "@/components/audience-cards";
import { CompactRow } from "@/components/compact-row";
import { ThisWeek } from "@/components/home/this-week";
import { AppPreview } from "@/components/home/app-preview";
import { Manifesto, PriceBlock, SafetyBand } from "@/components/home/home-blocks";
import { HomeFaq } from "@/components/home/home-faq";
import { HowItWorks } from "@/components/home/how-it-works";
import { ReviewsShowcase } from "@/components/home/reviews-showcase";
import { Universes } from "@/components/home/universes";
import { PageShell, PrimaryLink, Section, SectionHeading } from "@/components/ui";
import { Swash, TitleSparks } from "@/components/brand/doodles";
import { Link } from "@/i18n/navigation";
import { experienceBadge, NEW_EXPERIENCE_DAYS, seatsAvailable, type Experience, type HomeSectionId, type Session } from "@thecommunity/shared";
import { getCategories, getCity, getExperiencesWithoutUpcoming, getHomeSettings, getNextSessionPerExperience, getPublishedExperiences } from "@/lib/data";
import { formatDaySlot } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { DEFAULT_CITY } from "@/lib/site";

export const revalidate = 3600;

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, city, categories, home, upcomingAll, undated, published, weekend] = await Promise.all([
    getTranslations("home"),
    getCity(DEFAULT_CITY),
    getCategories(),
    getHomeSettings(),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY }),
    getExperiencesWithoutUpcoming({ cityId: DEFAULT_CITY }),
    getPublishedExperiences(),
    getNextSessionPerExperience({ cityId: DEFAULT_CITY, when: "weekend" }),
  ]);
  const cityName = city ? tr(city.name, locale) : "";
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
        <div key={id} data-testid={`home-${id}`}>
          <SectionHeading centered title={title} action={{ href: "/experiences", label: t("seeAll") }} />
          <ul className={`event-list ${dated.length < 3 ? "is-few" : ""}`}>
            {dated.map((x) => (
              <li key={x.experience.id}>
                <CompactRow experience={x.experience} session={x.session} />
              </li>
            ))}
          </ul>
        </div>
      )
    );
  };
  const banner = home.banner?.enabled ? home.banner : null;
  // Étape 3 : la prochaine date dans l'accroche (la plus proche qui a encore de la place, sinon la plus proche).
  const byDate = [...upcomingAll].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = byDate.find((s) => s.status !== "full" && seatsAvailable(s) > 0) ?? byDate[0];
  const nextLeft = next ? seatsAvailable(next) : 0;

  const sectionsById: Record<HomeSectionId, React.ReactNode> = {
    featured: cards("featured", t("featuredTitle"), picks),
    weekend: cards("weekend", t("weekendTitle", { city: cityName }), weekend.slice(0, 4).map((x) => ({ experience: x.experience, session: x }))),
    new: cards("new", t("newTitle"), fresh),
    popular: cards("popular", t("popularTitle"), popular),
    manifesto: <Manifesto key="manifesto" />,
    thisWeek: <ThisWeek key="thisWeek" limit={6} intro />,
    // La sécurité : la bande sombre de la page (fond encre, voir plus bas).
    trust: <SafetyBand key="trust" />,
    price: <PriceBlock key="price" />,
    app: <AppPreview key="app" />,
    how: <HowItWorks key="how" categories={categories} />,
    universes: <Universes key="universes" categories={categories} />,
    // Avis de l'accueil : choisis une fois pour toutes (24/11), ils ne changent pas avec les nouveaux avis.
    reviews: (
          <ReviewsShowcase
            key="reviews"
            reviews={(["r1", "r2", "r3"] as const).map((k) => ({ id: k, rating: 5, comment: t(`featuredReviews.${k}.text`), publicName: t(`featuredReviews.${k}.name`) }))}
            title={t("reviewsTitle")}
            subtitle={t("reviewsSubtitle")}
            photoAlt={t("reviewsPhotoAlt")}
            prevLabel={t("reviewsPrev")}
            nextLabel={t("reviewsNext")}
          />
      ),
    // Étape W : plus de section villes sur l'accueil (le choix de la ville reste dans « Cette semaine »).
    cities: null,
    faq: <HomeFaq key="faq" />,
  };

  return (
    <>
      {banner && (
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8" data-testid="home-banner">
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl bg-brand-50 px-5 py-3 text-center text-sm text-brand-900">
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
      {/* HERO (direction artistique « Soleil de Casa », docs/29) : sur ordinateur, la photo en forme libre part du coin
          haut droit et passe derrière le menu ; sur téléphone, la photo occupe le haut avec un bord ondulé, le texte dessous. */}
      <section
        data-hero-bleed
        className={`relative overflow-hidden bg-[radial-gradient(520px_420px_at_0%_0%,#fff_0%,transparent_70%),radial-gradient(620px_460px_at_8%_100%,var(--color-peach)_0%,transparent_62%)] bg-cream-light ${banner ? "mt-3" : "-mt-16 lg:-mt-20"}`}
      >
        <div className="absolute inset-y-0 end-0 hidden w-[54%] lg:block">
          <div className="absolute inset-0 [clip-path:url(#shape-hero)]">
            <Image src="/images/accueil-rooftop-casablanca.webp" alt={t("heroImageAlt")} fill priority sizes="55vw" className="object-cover object-[52%_35%]" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/20 to-transparent to-25%" />
          </div>
        </div>
        <div className="relative h-[400px] lg:hidden">
          <div className="absolute inset-0 [clip-path:url(#shape-hero-m)]">
            <Image src="/images/accueil-rooftop-casablanca.webp" alt={t("heroImageAlt")} fill priority sizes="100vw" className="object-cover object-[45%_30%]" />
          </div>
        </div>
        <PageShell className="relative z-10 lg:flex lg:min-h-[min(88vh,780px)] lg:items-center">
          <div className="pt-2 pb-16 text-center lg:max-w-[480px] lg:pt-28 lg:pb-28 lg:text-start">
            <h1 className="animate-fade-up font-display text-[2.75rem] leading-[1] font-semibold tracking-[-0.03em] text-brand-900 sm:text-6xl lg:text-[4.5rem]">
              {t("heroTitle1")}
              <br />
              <span className="text-gradient"><TitleSparks text={t("heroTitle2")} /></span>
            </h1>
            <Swash className="mx-auto mt-1 block h-4 w-52 lg:ms-36 lg:me-0 lg:w-72" />
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink/75 [animation-delay:120ms] animate-fade-up lg:mx-0 lg:mt-5 lg:text-lg">{t("heroSubtitle")}</p>
            <div className="mt-6 [animation-delay:220ms] animate-fade-up lg:mt-8">
              <PrimaryLink href="/experiences" className="w-full lg:w-auto lg:px-8 lg:py-4 lg:text-base">{t("heroCta")}</PrimaryLink>
            </div>
            {/* La prochaine date, mise à jour toute seule : du concret dès le premier écran. */}
            {next && (
              <Link
                href={`/experiences/${next.experience.slug}`}
                className="group mt-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-start shadow-card transition [animation-delay:300ms] animate-fade-up hover:shadow-float lg:max-w-md"
                data-testid="home-next"
              >
                <span className="bub-peach grid size-10 shrink-0 place-items-center rounded-full">
                  <CalendarDays className="size-5 text-[#b8381f]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-sm leading-snug">
                  <span className="block text-xs font-semibold tracking-[0.12em] text-muted uppercase">{t("nextLabel")}</span>
                  <span className="block font-semibold text-ink">
                    {next.rendezvousTitle ? tr(next.rendezvousTitle, locale) : tr(next.experience.title, locale)} · {formatDaySlot(next.startAt, locale)}
                  </span>
                  <span className="block text-ink/70">{nextLeft > 0 ? t("nextSeats", { count: nextLeft }) : t("nextFull")}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ink/40 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
              </Link>
            )}
          </div>
        </PageShell>
      </section>
      {/* Les sections suivent l'ordre du back-office (Accueil), sur des fonds alternés blanc et crème, avec le même
          espace partout (docs/29) ; la sécurité est la bande sombre de la page ; la phrase de clôture vient toujours à la fin. */}
      {(() => {
        const nodes = [
          ...home.sections.filter((x) => x.enabled).map((x) => ({ id: x.id as string, node: sectionsById[x.id] })),
          { id: "closing", node: <ClosingCta key="closing" /> },
        ].filter((x) => Boolean(x.node));
        let light = 0;
        // Direction artistique (docs/29) : la sécurité est un panneau sombre arrondi posé sur la section ; halo lilas derrière l'application.
        return nodes.map(({ id, node }) => (
          <Section
            key={id}
            tone={light++ % 2 === 0 ? "white" : "cream"}
            className={id === "app" ? "bg-[radial-gradient(600px_360px_at_50%_70%,var(--color-lilac),transparent_70%)]" : id === "closing" ? "!pt-10 sm:!pt-16" : ""}
          >
            {node}
          </Section>
        ));
      })()}
    </>
  );
}
