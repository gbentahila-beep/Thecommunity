import { organizerRating } from "@thecommunity/shared";
import { AtSign, BadgeCheck, Globe, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExperienceRow } from "@/components/experience-row";
import { MediaImage as Image } from "@/components/media";
import { ReviewItem } from "@/components/reviews/review-item";
import { PageShell, Stars } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getAllCategories, getCity, getExperiencesWithoutUpcoming, getPublicOrganizerBySlug, getPublicOrganizers, getPublishedExperiences, getReviews, getUpcomingSessions, publicLogo } from "@/lib/data";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { EmptyState } from "@/components/empty-state";
import { tr } from "@/lib/i18n-text";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;

export async function generateStaticParams() {
  if (FIREBASE_ENABLED) return [];
  const organizers = await getPublicOrganizers();
  return routing.locales.flatMap((locale) => organizers.map((o) => ({ locale, slug: o.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/organisateurs/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const o = await getPublicOrganizerBySlug(slug);
  if (!o) return {};
  return {
    title: `${o.name} — Casablanca`,
    description: tr(o.description, locale).slice(0, 160),
    alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/organisateurs/${slug}` },
  };
}

/** Étape 23 — page publique d'un organisateur validé : présentation, note de ses activités, dates, avis. */
export default async function OrganizerPage({ params }: PageProps<"/[locale]/organisateurs/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const o = await getPublicOrganizerBySlug(slug);
  if (!o) notFound();
  const [t, upcoming, undatedAll, published, categories, city, reviews] = await Promise.all([
    getTranslations("organizerPage"),
    getUpcomingSessions({}),
    getExperiencesWithoutUpcoming({}),
    getPublishedExperiences(),
    getAllCategories(),
    getCity(o.cityId),
    getReviews(),
  ]);
  const mine = published.filter((e) => e.organizerId === o.id);
  const ids = new Set(mine.map((e) => e.id));
  const seen = new Set<string>();
  const next = upcoming.filter((s) => ids.has(s.experienceId) && !seen.has(s.experienceId) && seen.add(s.experienceId));
  const undated = undatedAll.filter((e) => ids.has(e.id));
  const myReviews = reviews.filter((r) => ids.has(r.experienceId)).slice(0, 6);
  // Note de l'organisateur : moyenne des avis de toutes ses activités (pondérée par leur nombre).
  const { avg, count } = organizerRating(mine);
  const logo = publicLogo(o.logoPath);
  const cats = categories.filter((c) => o.categoryIds.includes(c.id));
  const insta = o.instagram ? o.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "") : "";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: o.name,
    url: `${SITE_URL}/organisateurs/${o.slug}`,
    description: tr(o.description, locale),
    address: { "@type": "PostalAddress", addressLocality: city ? tr(city.name, locale) : "Casablanca", addressCountry: "MA" },
    ...(count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: count } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageShell className="space-y-10 py-10">
        <header className="flex flex-col items-center gap-5 rounded-[var(--radius-card)] bg-white p-6 text-center shadow-card sm:p-8" data-testid="organizer-header">
          <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 font-display text-4xl text-brand-900">
            {logo ? <Image src={logo} alt="" fill sizes="96px" className="object-cover" /> : o.name.slice(0, 1)}
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold tracking-[0.18em] text-brand-700 uppercase">{t("eyebrow")}</p>
            <h1 className="page-title">{o.name}</h1>
            <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-brand-700" aria-hidden />{city ? tr(city.name, locale) : "Casablanca"}</span>
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand-700" aria-hidden />{t("verified")}</span>
              {count > 0 && (
                <span className="inline-flex items-center gap-1.5" data-testid="organizer-rating"><Stars value={avg} />{t("rating", { avg: avg.toFixed(1), count })}</span>
              )}
            </p>
            {cats.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-2" aria-label={t("categories")}>
                {cats.map((c) => (
                  <li key={c.id}>
                    <Link href={`/${o.cityId}/${c.id}`} className="rounded-full bg-badge px-3 py-1 text-xs font-medium text-brand-900">{tr(c.shortName, locale)}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        <section className="max-w-3xl space-y-4">
          <p className="whitespace-pre-line text-lg leading-relaxed text-ink/85">{tr(o.description, locale)}</p>
          {(o.website || insta) && (
            <p className="flex flex-wrap gap-4 text-sm font-semibold text-brand-900">
              {o.website && (
                <a href={o.website.startsWith("http") ? o.website : `https://${o.website}`} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                  <Globe className="size-4" aria-hidden />{t("website")}
                </a>
              )}
              {insta && (
                <a href={`https://www.instagram.com/${encodeURIComponent(insta)}/`} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                  <AtSign className="size-4" aria-hidden />{insta} (Instagram)
                </a>
              )}
            </p>
          )}
        </section>

        <section aria-labelledby="org-upcoming" className="space-y-4">
          <h2 id="org-upcoming" className="section-title">{t("upcoming")}</h2>
          {next.length ? (
            <div className="event-list mx-auto max-w-3xl lg:max-w-none" data-testid="organizer-activities">
              {next.map((s) => <ExperienceRow key={s.id} session={s} experience={s.experience} showDay />)}
            </div>
          ) : (
            <EmptyState variant="compact" bab="doodle" mood="wait" text={t("none")} />
          )}
        </section>

        {undated.length > 0 && (
          <section aria-labelledby="org-undated" className="space-y-4">
            <h2 id="org-undated" className="section-title">{t("undated")}</h2>
            <div className="event-list mx-auto max-w-3xl lg:max-w-none">
              {undated.map((e) => <ExperienceRow key={e.id} experience={e} />)}
            </div>
          </section>
        )}

        {myReviews.length > 0 && (
          <section aria-labelledby="org-reviews" className="space-y-4">
            <h2 id="org-reviews" className="section-title">{t("reviews")}</h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {myReviews.map((r) => (
                <ReviewItem key={r.id} review={r} locale={locale} />
              ))}
            </ul>
          </section>
        )}

        <Link href="/experiences" className="inline-block font-semibold text-brand-900 underline underline-offset-4">{t("back")}</Link>
      </PageShell>
    </>
  );
}
