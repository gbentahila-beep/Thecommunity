import {
  DEFAULT_CANCELLATION_POLICY,
  formatMoney,
  LOW_SEATS_THRESHOLD,
  seatsAvailable,
  type Experience,
} from "@thecommunity/shared";
import { CalendarDays, Clock, Languages, Leaf, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import { MediaImage as Image } from "@/components/media";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FavoriteButton } from "@/components/favorite-button";
import { PageShell, Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { ExperienceAlertButton } from "@/components/experience-alert-button";
import { getCategory, getExperienceBySlug, getPastSessions, getPublishedExperiences, getReviews, getUpcomingSessions } from "@/lib/data";
import { formatLongDate, formatShortSlot, formatTimeRange } from "@/lib/format";
import { tr } from "@/lib/i18n-text";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  if (FIREBASE_ENABLED) return []; // mode Firebase : pages rendues à la visite
  const experiences = await getPublishedExperiences();
  return routing.locales.flatMap((locale) => experiences.map((e) => ({ locale, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/experiences/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const exp = await getExperienceBySlug(slug);
  if (!exp) return {};
  const title = `${tr(exp.title, locale)} — ${exp.district}, Casablanca`;
  return {
    title,
    description: tr(exp.summary, locale),
    alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/experiences/${slug}` },
    openGraph: { title, description: tr(exp.summary, locale), images: exp.images[0] ? [exp.images[0].path] : undefined },
  };
}

const LANGUAGE_NAMES: Record<string, string> = { fr: "Français", ar: "العربية", darija: "Darija", en: "English", es: "Español" };

export default async function ExperiencePage({ params }: PageProps<"/[locale]/experiences/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const exp = await getExperienceBySlug(slug);
  if (!exp) notFound();
  const [t, tCard, category, sessions, reviews, past] = await Promise.all([
    getTranslations("experience"),
    getTranslations("card"),
    getCategory(exp.categoryId),
    getUpcomingSessions({ experienceId: exp.id }),
    getReviews(exp.id),
    getPastSessions(exp.id),
  ]);
  const lang = locale as "fr" | "ar";
  const next = sessions.find((s) => seatsAvailable(s) > 0) ?? sessions[0];
  const hours = Math.floor(exp.durationMinutes / 60);
  const minutes = exp.durationMinutes % 60;
  const duration =
    hours && minutes
      ? t("durationHoursMinutes", { hours, minutes: String(minutes).padStart(2, "0") })
      : hours
        ? t("durationHours", { hours })
        : t("durationMinutes", { minutes });

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
      location: { "@type": "Place", name: exp.venue.name, address: { "@type": "PostalAddress", addressLocality: "Casablanca", addressCountry: "MA" } },
      offers: {
        "@type": "Offer",
        price: (s.price.amount / 100).toFixed(2),
        priceCurrency: s.price.currency,
        availability: seatsAvailable(s) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
        url: `${SITE_URL}/experiences/${exp.slug}`,
      },
      organizer: { "@type": "Organization", name: "The Host Club", url: SITE_URL },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageShell className="pt-4 pb-32 lg:pt-8 lg:pb-12">
        <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-muted">
          <Link href="/" className="hover:text-plum-900">{t("breadcrumbHome")}</Link>
          <span className="mx-2">/</span>
          <Link href={`/${exp.cityId}/${exp.categoryId}`} className="hover:text-plum-900">
            {category ? tr(category.name, locale) : ""}
          </Link>
        </nav>

        <Gallery exp={exp} locale={locale} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-10">
            <header>
              <span className="inline-block rounded-full bg-badge px-3 py-1 text-xs font-medium text-plum-900">
                {category ? tr(category.shortName, locale) : ""}
              </span>
              <h1 className="mt-3 font-display text-4xl leading-tight font-medium text-plum-900 sm:text-5xl">{tr(exp.title, locale)}</h1>
              <p className="mt-3 text-lg text-ink/80">{tr(exp.summary, locale)}</p>
              {exp.ratingCount > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                  <Stars value={exp.ratingAvg} />
                  <span className="font-semibold text-ink">{exp.ratingAvg.toFixed(1)}</span>
                  <span>· {t("reviewsCount", { count: exp.ratingCount })}</span>
                </p>
              )}
            </header>

            <ul className="grid gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card sm:grid-cols-2">
              {next && (
                <Fact icon={CalendarDays} label={formatLongDate(next.startAt, locale)} value={formatTimeRange(next.startAt, next.endAt, locale)} />
              )}
              <Fact icon={MapPin} label={exp.district} value="Casablanca" />
              <Fact icon={Users} label={t("groupSize")} value={formatLabel(exp, t, next?.capacity ?? 0)} />
              <Fact icon={Clock} label={t("duration")} value={duration} />
              <Fact icon={Languages} label={t("languages")} value={exp.languages.map((l) => LANGUAGE_NAMES[l] ?? l).join(", ")} />
              {exp.alcoholServed === false && <Fact icon={Leaf} label={t("alcoholFree")} value="" />}
            </ul>

            <Section title={t("about")}>
              <p className="leading-relaxed text-ink/85">{tr(exp.description, locale)}</p>
            </Section>

            <Section title={t("included")}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {exp.included.map((item) => (
                  <li key={item.fr} className="flex items-start gap-2.5 text-ink/85">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-plum-700" aria-hidden />
                    {tr(item, locale)}
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={t("venue")}>
              <p className="font-medium text-ink">{exp.venue.name}</p>
              <p className="text-muted">{exp.venue.address}</p>
              {exp.venue.revealPolicy === "on_group_reveal" && (
                <p className="mt-3 rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-900">{t("venueRevealed")}</p>
              )}
            </Section>

            <Section title={t("practical")}>
              <p className="text-ink/85">{tr(exp.practicalInfo, locale)}</p>
            </Section>

            <Section title={t("cancellation")}>
              <p className="text-ink/85">{tr(DEFAULT_CANCELLATION_POLICY.label, locale)}.</p>
            </Section>

            {past.length > 0 && (
              <Section title={t("pastEditions")}>
                <p className="text-ink/85">
                  {t("pastEditionsText", { count: past.length, last: formatLongDate(past[0]!.startAt, locale) })}
                </p>
              </Section>
            )}
            {reviews.length > 0 && (
              <Section title={t("reviews")}>
                <ul className="space-y-4">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-line bg-white/70 p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink">{r.publicName}</span>
                        <Stars value={r.rating} />
                      </div>
                      <p className="mt-2 text-ink/85">{r.comment}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>

          {/* Colonne réservation */}
          <aside id="dates" className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-float">
              <p className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-ink">{formatMoney(exp.price, lang)}</span>
                <span className="text-sm text-muted">{t("perPerson")}</span>
              </p>
              {exp.admission === "on_request" && <p className="mt-3 rounded-xl bg-plum-50 px-3 py-2 text-sm text-plum-900">{t("onRequestNote")}</p>}
              <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted">{t("nextDates")}</h2>
              {sessions.length === 0 ? (
                <>
                  <p className="mt-3 text-sm text-muted">{t("noDates")}</p>
                  {FIREBASE_ENABLED && <ExperienceAlertButton experienceId={exp.id} slug={exp.slug} />}
                </>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {sessions.map((s) => {
                    const left = seatsAvailable(s);
                    const full = left === 0;
                    return (
                      <li key={s.id}>
                        <Link
                          href={`/reserver/${s.id}`}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition ${
                            full ? "border-line bg-cream/60" : "border-line hover:border-plum-700 hover:bg-plum-50"
                          }`}
                        >
                          <span>
                            <span className="block font-semibold text-ink">{formatLongDate(s.startAt, locale)}</span>
                            <span className="text-sm text-muted">{formatTimeRange(s.startAt, s.endAt, locale)}</span>
                          </span>
                          <span
                            className={`shrink-0 text-end text-xs font-semibold ${
                              full ? "text-muted" : left <= LOW_SEATS_THRESHOLD ? "text-plum-700" : "text-cat-move"
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
                  className="mt-5 hidden w-full items-center justify-center rounded-full bg-plum-900 px-6 py-3.5 font-semibold text-white transition hover:bg-plum-800 lg:flex"
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
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-ink">{formatMoney(exp.price, lang)}</p>
              <p className="text-xs text-muted">{formatShortSlot(next.startAt, locale)}</p>
            </div>
            <Link href={`/reserver/${next.id}`} className="rounded-full bg-plum-900 px-6 py-3 font-semibold text-white">
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

function Fact({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-plum-700" strokeWidth={1.6} aria-hidden />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {value && <span className="text-sm text-muted">{value}</span>}
      </span>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-2xl font-medium text-plum-900">{title}</h2>
      {children}
    </section>
  );
}

function Gallery({ exp, locale }: { exp: Experience; locale: string }) {
  const [cover, ...rest] = exp.images;
  if (!cover) return null;
  return (
    <div className={`grid gap-3 ${rest.length ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] sm:aspect-[16/9] lg:aspect-auto lg:h-[460px]">
        <Image src={cover.path} alt={tr(cover.alt, locale)} fill priority sizes="(min-width: 1024px) 66vw, 100vw" className="object-cover" />
        <FavoriteButton experienceId={exp.id} className="absolute end-4 top-4" />
      </div>
      {rest.length > 0 && (
        <div className="hidden gap-3 lg:grid lg:grid-rows-2">
          {rest.slice(0, 2).map((img) => (
            <div key={img.path} className="relative overflow-hidden rounded-[var(--radius-card)]">
              <Image src={img.path} alt={tr(img.alt, locale)} fill sizes="33vw" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
