import {
  LOW_SEATS_THRESHOLD,
  formatMoney,
  meetingSummary,
  placeLabel,
  pricingOf,
  seatsAvailable,
  type CategoryKey,
  type Experience,
  restaurantBudget,
  extraText,
  bookingClosesAt,
  bookingWindow,
  type VenueTier,
} from "@thecommunity/shared";
import { Backpack, CalendarDays, Gem, CloudSun, Gauge, HeartPulse, Languages, Leaf, MapPin, Shirt, UserCheck, Users, UsersRound, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { MediaImage as Image } from "@/components/media";
import { ExperienceGallery } from "@/components/experience-gallery";
import { VenueMap } from "@/components/venue-map";
import { ReviewItem } from "@/components/reviews/review-item";
import { EventEssentials, type EssentialItem } from "@/components/meeting-section";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FavoriteButton } from "@/components/favorite-button";
import { ExperienceRow } from "@/components/experience-row";
import { PageShell, PrimaryLink, Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { ExperienceAlertButton } from "@/components/experience-alert-button";
import { budgetText, memberAmountFor, PriceTag } from "@/components/price-tag";
import { getCancellationPolicies, policyOf } from "@/lib/data/policies";
import { getArchivedExperience, getCategory, getCity, getExperienceBySlug, getMembershipPlan, getPublicOrganizer, getPublishedExperiences, getRendezvousList, getReviews, getUpcomingSessions, publicLogo } from "@/lib/data";
import { formatLongDate, formatShortSlot, formatTime, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { richText } from "@/lib/rich-text";
import { SITE_URL } from "@/lib/site";
import { Bab } from "@/components/brand/bab";
import { babForCategory } from "@/components/brand/bab-art";

export const revalidate = 300;

export async function generateStaticParams() {
  if (FIREBASE_ENABLED) return []; // mode Firebase : pages rendues à la visite
  const experiences = await getPublishedExperiences();
  return routing.locales.flatMap((locale) => experiences.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/experiences/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) {
    const retired = await getArchivedExperience(slug);
    return retired ? { title: tr(retired.title, locale), robots: { index: false, follow: true } } : {};
  }
  const city = await getCity(exp.cityId);
  // Lieu secret : pas de quartier, même dans le titre de la page (docs/22).
  const title = `${tr(exp.title, locale)} — ${placeLabel(exp.district, city ? tr(city.name, locale) : "Casablanca")}`;
  return {
    title,
    description: tr(exp.summary, locale),
    alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/experiences/${slug}` },
    openGraph: { title, description: tr(exp.summary, locale), images: exp.images[0] ? [exp.images[0].path] : undefined },
  };
}

/** Fiche d'une expérience archivée : elle n'est plus proposée, on oriente vers des expériences proches. */
async function RetiredExperience({ title, categoryId, cityId }: { title: string; categoryId: string; cityId: string }) {
  const t = await getTranslations("experience");
  // Ville + univers : la requête utilise l'index existant (ville, univers, statut, date). Une erreur de lecture ne doit
  // jamais faire tomber la page : sans suggestions, elle reste utile.
  const similar = (await getUpcomingSessions({ cityId, categoryId: categoryId as CategoryKey }).catch(() => [])).slice(0, 3);
  return (
    <PageShell className="py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold tracking-[0.18em] text-brand-700 uppercase">{t("retiredEyebrow")}</p>
        <h1 className="page-title mt-3">{title}</h1>
        <p className="mt-4 text-lg text-ink/75">{t("retiredText")}</p>
        <PrimaryLink href="/experiences" className="mt-7">{t("retiredCta")}</PrimaryLink>
      </div>
      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-14">
          <h2 id="similar" className="section-title">{t("retiredSimilar")}</h2>
          {/* Même liste que partout (Découvrir, Cette semaine) : lignes compactes dans une carte blanche. */}
          <div className={`event-list mx-auto mt-5 max-w-3xl ${similar.length < 3 ? "is-few" : "lg:max-w-none"}`} data-testid="similar-list">
            {similar.map((s) => (
              <ExperienceRow key={s.id} session={s} experience={s.experience} showDay />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}

/** « mardi 24 novembre » au milieu d'une phrase (le français ne met pas de majuscule au jour). */
const lowerFirst = (s: string, locale: string) => (locale === "fr" ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** Nom du jour (0 = dimanche) dans la langue de la page, d'après une date de référence (un dimanche). */
function weekdayName(weekday: number, locale: string) {
  const d = new Date(Date.UTC(2026, 10, 22 + weekday, 12));
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-GB" : "fr-FR", { weekday: "long", timeZone: "UTC" }).format(d);
}

const LANGUAGE_NAMES: Record<string, string> = { fr: "Français", ar: "العربية", darija: "Darija", en: "English", es: "Español" };

export default async function ExperiencePage({ params }: PageProps<"/[locale]/experiences/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const exp = await getExperienceBySlug(slug);
  if (!exp) {
    const retired = await getArchivedExperience(slug);
    if (!retired) notFound();
    return <RetiredExperience title={tr(retired.title, locale)} categoryId={retired.categoryId} cityId={retired.cityId} />;
  }
  const [t, tCard, t2, category, subcategory, sessions, reviews, plan, policies, organizer, tm, city] = await Promise.all([
    getTranslations("experience"),
    getTranslations("card"),
    getTranslations("twoPart"),
    getCategory(exp.categoryId),
    exp.subcategoryId ? getCategory(exp.subcategoryId) : Promise.resolve(null),
    getUpcomingSessions({ experienceId: exp.id }),
    getReviews(exp.id),
    getMembershipPlan(),
    getCancellationPolicies(),
    getPublicOrganizer(exp.organizerId),
    getTranslations("meeting"),
    getCity(exp.cityId),
  ]);
  const cityName = city ? tr(city.name, locale) : "Casablanca";
  // Étape 22 : politique d'annulation propre à l'activité.
  const policy = policyOf(policies, exp.cancellationPolicyId);
  const memberAmount = memberAmountFor(plan, exp.price, exp);
  const twoPart = pricingOf(exp);
  // Restaurant (docs/16) : menu négocié = montant exact ; consommation libre = budget estimé (ou repère de la gamme).
  const budget = restaurantBudget(exp);
  const surprise = exp.venue.revealPolicy === "on_group_reveal";
  const lang = locale as "fr" | "ar" | "en";
  // docs/25 : rendez-vous de la semaine — gammes (une expérience chacune) et fenêtre de réservation (une date ouverte,
  // la suivante en avance pour les abonnés Pass, les autres « ouvrent le … »).
  const rv = exp.rendezvousId ? (await getRendezvousList()).find((x) => x.id === exp.rendezvousId) ?? null : null;
  const rvSiblings = rv
    ? await (async () => {
        const all = new Map((await getPublishedExperiences()).map((x) => [x.id, x]));
        return rv.tiers.map((x) => ({ tier: x.tier as VenueTier, monthly: x.frequency === "first_of_month", experience: all.get(x.experienceId) })).filter((x) => x.experience);
      })()
    : [];
  // Lot D : l'activité du samedi a une seule date ouverte pour toute la rotation (fenêtre calculée sur toutes ses dates).
  const rotation = rv?.kind === "rotation";
  const win = exp.rendezvousId
    ? bookingWindow(rotation ? (await getUpcomingSessions({ rendezvousId: exp.rendezvousId })).filter((s) => s.rendezvousId === exp.rendezvousId) : sessions, exp, new Date(), bookingClosesAt)
    : null;
  const shownSessions = win ? sessions.filter((s) => win.has(s.id) && win.get(s.id)!.state !== "off").slice(0, 4) : sessions;
  const next = win ? sessions.find((s) => win.get(s.id)?.state === "open") : sessions.find((s) => seatsAvailable(s) > 0) ?? sessions[0];
  // Étape 29 : « Qui allez-vous rencontrer ? » (chiffres globaux sur les inscrits de la prochaine date, à partir de 4).
  const meeting = meetingSummary(exp, next ?? null, null);

  // Étape P : l'essentiel, sans répétition (lieu une fois, taille du groupe une fois).
  const g = exp.groupConfig;
  const composed = exp.bookingMode === "social_dinner" || exp.bookingMode === "group";
  const groupText =
    exp.bookingMode === "social_dinner"
      ? g && g.minSize < g.maxSize ? t("tablesRange", { min: g.minSize, max: g.maxSize }) : t("tablesOf", { size: g?.targetSize ?? g?.maxSize ?? 6 })
      : exp.bookingMode === "group"
        ? (g?.minSize ?? 4) === (g?.maxSize ?? 6) ? t("teamsOf", { count: g?.maxSize ?? 4 }) : t("teamsRange", { min: g?.minSize ?? 4, max: g?.maxSize ?? 6 })
        : formatLabel(exp, t, next?.capacity ?? 0);
  // Étape Q : toujours les 6 mêmes cases, dans le même ordre, sur toutes les fiches (date, lieu, format,
  // gamme ou niveau, langues, public). L'heure de fin dit déjà la durée.
  const minAge = exp.minAge != null && exp.minAge > 18 ? exp.minAge : 18;
  const essentials: EssentialItem[] = [
    next
      ? { icon: CalendarDays, label: formatLongDate(next.startAt, locale), value: formatTimeRange(next.startAt, next.endAt, locale) }
      : { icon: CalendarDays, label: t("datesSoonLabel"), value: t("datesSoonValue") },
    surprise
      ? { icon: MapPin, label: t("secretVenue"), value: t("venueRevealed") }
      : { icon: MapPin, label: exp.venue.name || exp.district || cityName, value: [exp.venue.name ? exp.district : "", cityName].filter(Boolean).join(", ") },
    { icon: Users, label: groupText, value: composed ? t("composedByTeam") : t("bookAlone") },
    exp.categoryId === "eat"
      ? {
          icon: Gem,
          label: exp.venueTier ? t2(`tier_${exp.venueTier}`) : t("tierAny"),
          // Étape S : le budget sur place du restaurant vit ici, sous la gamme (plus d'encadré « Ce que vous payez »).
          value: [budget ? t("tierBudget", { amount: budgetText(budget, lang) }) : "", extraText(exp, "ambiance", exp.ambiance, locale)].filter(Boolean).join(" · ") || t("tierLabel"),
          link: { href: "/aide/gammes-des-tables", label: t("tierHelp") },
        }
      : { icon: Gauge, label: t(`level_${exp.level || "all"}`), value: t("levelLabel") },
    { icon: Languages, label: meeting.languages.map((l) => LANGUAGE_NAMES[l] ?? l).join(", ") || "Français", value: t("languages") },
    meeting.audience === "women"
      ? { icon: UsersRound, label: tm("audienceWomen"), value: meeting.targetAge ? t("targetAge", { min: meeting.targetAge.min ?? minAge, max: meeting.targetAge.max ?? 99 }) : t("fromAge", { age: minAge }) }
      : meeting.targetAge
        ? { icon: UserCheck, label: t("targetAge", { min: meeting.targetAge.min ?? minAge, max: meeting.targetAge.max ?? 99 }), value: minAge > 18 ? `${t("targetAgeNote")} · ${t("fromAge", { age: minAge })}` : t("targetAgeNote") }
        : { icon: UserCheck, label: t("openToAll"), value: t("fromAge", { age: minAge }) },
  ];
  // 26/11 : plus d'aperçu des inscrits (nombre, âges, centres d'intérêt) avant de réserver.
  const onSiteLine =
    twoPart?.model === "fixed_partner" && twoPart.partner?.price
      ? t("onSiteFixed", { amount: formatMoney(twoPart.partner.price, lang) })
      : twoPart?.model === "variable_consumption"
        ? t("onSiteConsumption")
        : t("onSiteNothing");
  const includedText = exp.included.map((i) => i.fr.toLowerCase()).join(" | ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": sessions.map((s) => ({
      "@type": "Event",
      name: tr(exp.title, locale),
      description: tr(exp.summary, locale),
      startDate: s.startAt,
      endDate: s.endAt,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      image: exp.images.map((i) => `${SITE_URL}${i.path}`),
      location: { "@type": "Place", name: exp.venue.name, address: { "@type": "PostalAddress", addressLocality: cityName, addressCountry: "MA" } },
      offers: {
        "@type": "Offer",
        price: (s.price.amount / 100).toFixed(2),
        priceCurrency: s.price.currency,
        availability: seatsAvailable(s) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        url: `${SITE_URL}/experiences/${exp.slug}`,
      },
      organizer: { "@type": "Organization", name: "Wenzy", url: SITE_URL },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageShell className="pt-4 pb-32 lg:pt-8 lg:pb-12">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
          <Link href="/" className="hover:text-brand-900">{t("breadcrumbHome")}</Link>
          <span className="mx-2">/</span>
          <Link href={`/${exp.cityId}/${exp.categoryId}`} className="hover:text-brand-900">
            {category ? tr(category.name, locale) : ""}
          </Link>
          {subcategory && (
            <>
              <span className="mx-2">/</span>
              <Link href={`/${exp.cityId}/${subcategory.id}`} className="hover:text-brand-900">{tr(subcategory.name, locale)}</Link>
            </>
          )}
        </nav>

        <ExperienceGallery photos={exp.images.map((i) => ({ src: i.path, alt: tr(i.alt, locale) }))}>
          <FavoriteButton experienceId={exp.id} className="absolute end-4 top-4" />
        </ExperienceGallery>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-10">
            <header>
              <span className="inline-block rounded-full bg-badge px-3 py-1 text-xs font-medium text-brand-900">
                {category ? tr(category.shortName, locale) : ""}
                {subcategory ? ` · ${tr(subcategory.shortName, locale)}` : ""}
              </span>
              <h1 className="page-title mt-3">{rv && !rotation ? tr(rv.title as never, locale) : tr(exp.title, locale)}</h1>
              {rv && (
                <p className="mt-2 text-sm font-semibold text-brand-700" data-testid="rv-weekly">
                  {rotation
                    ? t("rvRotation", { name: tr(rv.title as never, locale), day: weekdayName(rv.weekday, locale).toLowerCase() })
                    : t("rvWeekly", { day: weekdayName(rv.weekday, locale), time: rv.time.replace(":", locale === "fr" ? "h" : ":") })}
                </p>
              )}
              <p className="mt-3 text-lg text-ink/80">{tr(exp.summary, locale)}</p>
              {exp.ratingCount > 0 && (
                <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
                  <Stars value={exp.ratingAvg} />
                  <span className="font-semibold text-ink">{exp.ratingAvg.toFixed(1)}</span>
                  <span>· {t("reviewsCount", { count: exp.ratingCount })}</span>
                </p>
              )}
            </header>

            {/* Étape P : l'essentiel en un seul encadré, chaque information une seule fois. */}
            <EventEssentials items={essentials}>
              {!surprise && exp.venue.geo && <div className="mt-4"><VenueMap lat={exp.venue.geo.lat} lng={exp.venue.geo.lng} place={exp.venue.name} /></div>}
            </EventEssentials>

            <Section title={t("about")}>
              <p className="leading-relaxed text-ink/85">{tr(exp.description, locale)}</p>
              {exp.included.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted">{t("included")}</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {exp.included.map((item) => (
                      <li key={item.fr} className="flex items-start gap-2.5 text-ink/85">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-700" aria-hidden />
                        {tr(item, locale)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Section>

            {/* Tout le reste en une seule liste : à apporter, tenue, plein air, âge, alcool, infos pratiques, annulation. */}
            <Section title={t("goodToKnow")}>
              <ul className="space-y-3" data-testid="activity-details">
                {exp.equipmentProvided && !includedText.includes(exp.equipmentProvided.trim().toLowerCase()) && <Detail icon={Backpack} label={t("equipmentProvided")} text={extraText(exp, "equipmentProvided", exp.equipmentProvided, locale)} />}
                {exp.whatToBring && <Detail icon={Backpack} label={t("whatToBring")} text={extraText(exp, "whatToBring", exp.whatToBring, locale)} />}
                {exp.dressCode && <Detail icon={Shirt} label={t("dressCode")} text={extraText(exp, "dressCode", exp.dressCode, locale)} />}
                {exp.outdoor && <Detail icon={CloudSun} label={t("outdoorTitle")} text={t("outdoorText")} />}
                {exp.physicalActivity && <Detail icon={HeartPulse} label={t("physicalTitle")} text={richText(t.raw("physicalText") as string, "")} />}
                {exp.alcoholServed === false && <Detail icon={Leaf} label={t("alcoholFree")} text="" />}
                {tr(exp.practicalInfo, locale) && <Detail icon={Sparkles} label={t("practical")} text={tr(exp.practicalInfo, locale)} />}
                <Detail icon={CalendarDays} label={t("cancellation")} text={`${tr(policy.label, locale)}.`} />
              </ul>
            </Section>

            {organizer && (
              <Section title={t("organizedBy")}>
                <div className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-4 shadow-card" data-testid="organizer-block">
                  <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 font-display text-2xl text-brand-900">
                    {publicLogo(organizer.logoPath) ? <Image src={publicLogo(organizer.logoPath)!} alt="" fill sizes="64px" className="object-cover" /> : organizer.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{organizer.name}</p>
                    {organizer.ratingCount > 0 && (
                      <p className="flex items-center gap-1.5 text-sm text-muted">
                        <Stars value={organizer.ratingAvg} /> {organizer.ratingAvg.toFixed(1)} · {t("reviewsCount", { count: organizer.ratingCount })}
                      </p>
                    )}
                    <Link href={`/organisateurs/${organizer.slug}`} className="text-sm font-semibold text-brand-900 underline underline-offset-4">{t("organizerPage")}</Link>
                  </div>
                </div>
              </Section>
            )}

            <Section title={t("reviews")}>
              {reviews.length > 0 ? (
                <ul className="space-y-4" id="avis">
                  {reviews.map((r) => (
                    <ReviewItem key={r.id} review={r} locale={locale} />
                  ))}
                </ul>
              ) : (
                <p className="text-ink/70" id="avis">{t("noReviewsYet")}</p>
              )}
            </Section>
          </div>

          {/* Colonne réservation */}
          <aside id="dates" className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative rounded-[var(--radius-card)] bg-white p-5 shadow-float">
              <Bab name={babForCategory(exp.categoryId)} tilt={-6} className="pointer-events-none absolute -top-[54px] end-5 w-16" />
              <p className="flex flex-wrap items-baseline gap-2">
                <PriceTag price={exp.price} memberAmount={memberAmount} lang={lang} memberLabel={tCard("memberShort")} size="lg" pricing={null} t2={t2} budget={null} />
                <span className="text-sm text-muted">{t("perPerson")}</span>
              </p>
              {exp.membersOnly && <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">{t("membersOnlyNote")}</p>}
              {/* Étape S : une seule ligne sous le prix ; le budget d'un restaurant est dans la case « Gamme ». */}
              <p className="mt-1 text-sm text-muted" data-testid="on-site-line">{onSiteLine}</p>
              {/* Étape 28 : l'abonnement n'est proposé ici que si l'expérience est réservée aux membres (sinon : après la 1re expérience). */}
              {plan && exp.membersOnly && (
                <Link href="/abonnement" className="mt-2 inline-block text-sm font-semibold text-brand-900 underline underline-offset-4">
                  {t("becomeMember")}
                </Link>
              )}
              {exp.admission === "on_request" && <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">{t("onRequestNote")}</p>}
              {rvSiblings.length > 1 && (
                <div className="mt-4" data-testid="rv-tiers">
                  <p className="text-sm font-semibold uppercase tracking-wide text-muted">{t("rvTiersTitle")}</p>
                  <div className="mt-2 grid gap-2" role="list">
                    {rvSiblings.map((x) => {
                      const on = x.experience!.id === exp.id;
                      const b = restaurantBudget(x.experience!);
                      return (
                        <Link key={x.tier} role="listitem" href={`/experiences/${x.experience!.slug}#dates`} aria-current={on ? "true" : undefined} className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-sm ${on ? "border-brand-700 bg-brand-50" : "border-line hover:border-brand-700"}`}>
                          <span className="font-semibold text-ink">{t2(`tier_${x.tier}`)}{x.monthly && <span className="ms-1 font-normal text-muted">· {t("rvMonthly")}</span>}</span>
                          {b && <span className="text-muted">{budgetText(b, lang)}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
              <h2 id="alerte" className="mt-5 scroll-mt-28 text-sm font-semibold uppercase tracking-wide text-muted">{t("nextDates")}</h2>
              {shownSessions.length === 0 ? (
                <>
                  <p className="mt-3 text-sm text-muted">{t("noDates")}</p>
                  {FIREBASE_ENABLED && <ExperienceAlertButton experienceId={exp.id} slug={exp.slug} />}
                </>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {shownSessions.map((s) => {
                    const left = seatsAvailable(s);
                    const full = left === 0;
                    const w = win?.get(s.id);
                    // docs/25 : date pas encore ouverte → pas de lien, « Ouvre le … » (en avance pour les abonnés Pass).
                    if (w && w.state !== "open") {
                      return (
                        <li key={s.id}>
                          <div className="rounded-2xl border border-dashed border-line px-4 py-3" data-testid="rv-later">
                            <span className="block font-semibold text-ink/70">{formatLongDate(s.startAt, locale)} · {formatTime(s.startAt, locale)}</span>
                            {w.opensAt && <span className="mt-0.5 block text-xs text-muted">{t("rvOpensAt", { day: lowerFirst(formatLongDate(w.opensAt.toISOString(), locale), locale), time: formatTime(w.opensAt.toISOString(), locale) })}</span>}
                            {w.state === "pass" && (
                              <Link href={`/reserver/${s.id}`} className="mt-1 inline-block text-xs font-semibold text-brand-900 underline underline-offset-4">{t("rvPassEarly")}</Link>
                            )}
                          </div>
                        </li>
                      );
                    }
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/reserver/${s.id}`}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                            full ? "border-line bg-cream/60" : "border-line hover:border-brand-700 hover:bg-brand-50"
                          }`}
                        >
                          <span>
                            <span className="block font-semibold text-ink">{formatLongDate(s.startAt, locale)}</span>
                            <span className="text-sm text-muted">{formatTimeRange(s.startAt, s.endAt, locale)}</span>
                          </span>
                          <span
                            className={`shrink-0 text-end text-xs font-semibold ${
                              full ? "text-muted" : left <= LOW_SEATS_THRESHOLD ? "text-brand-700" : "text-cat-move"
                            }`}
                          >
                            {full ? tCard("waitlist") : t("seatsLeft", { count: left })}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
              {next && (
                <Link
                  href={`/reserver/${next.id}`}
                  className="btn btn-primary mt-5 hidden w-full lg:flex"
                >
                  {exp.admission === "on_request" ? t("requestCta") : t("bookCta")}
                </Link>
              )}
            </div>
          </aside>
        </div>
      </PageShell>

      {/* Barre de réservation collante sur mobile */}
      {next && (
        <div data-testid="mobile-book-bar" className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white px-4 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-3 max-[359px]:flex-col max-[359px]:items-stretch max-[359px]:gap-2">
            <div className="min-w-0 flex-1">
              <p className="leading-tight"><PriceTag price={exp.price} memberAmount={memberAmount} lang={lang} memberLabel={tCard("memberShort")} pricing={twoPart} t2={t2} detail={false} budget={budget} /></p>
              <p className="text-xs text-muted">{formatShortSlot(next.startAt, locale)}</p>
            </div>
            <Link href={`/reserver/${next.id}`} className="btn btn-primary h-12 shrink-0 whitespace-nowrap">
              {exp.admission === "on_request" ? t("requestCta") : t("bookCta")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

function formatLabel(exp: Experience, t: (key: string, values?: Record<string, string | number>) => string, capacity: number) {
  const g = exp.groupConfig;
  switch (exp.bookingMode) {
    case "social_dinner":
      return t("socialDinnerFormat", { size: g?.targetSize ?? 6 });
    case "group":
      return t("groupFormat", { min: g?.minSize ?? 4, max: g?.maxSize ?? 6 });
    case "open":
      return t("openFormat", { max: exp.maxSeatsPerBooking });
    case "private":
      return t("privateFormat");
    default:
      return t("individualFormat", { capacity });
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 card-title">{title}</h2>
      {children}
    </section>
  );
}

function Detail({ icon: Icon, label, text }: { icon: typeof Backpack; label: string; text: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        <span className="text-ink/80">{text}</span>
      </span>
    </li>
  );
}
