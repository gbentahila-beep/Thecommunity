import { REVIEW_DETAIL_KEYS, type Review } from "@thecommunity/shared";
import { ChevronDown, Star } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { MediaImage as Image } from "@/components/media";
import { EmptyState } from "@/components/empty-state";
import { PageShell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { getAllReviews, getCategories, getPublishedExperiences } from "@/lib/data";
import { formatCalendarDate } from "@/lib/format";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/avis">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "reviewsPage" });
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: locale === "fr" ? "/avis" : `/${locale}/avis` } };
}

const SORTS = ["recent", "best", "worst"] as const;
type Sort = (typeof SORTS)[number];
const PAGE = 12;
const AVATARS = ["bg-[#f7e1d7] text-[#8a3b22]", "bg-[#dfe8f7] text-[#2f3e5c]", "bg-[#e3efe0] text-[#3f5f3e]", "bg-[#f3e2ea] text-[#7a2f45]", "bg-[#f4ebd6] text-[#7a5a17]"];
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

function StarsRow({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex text-[#e3a32e]" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`${size} ${n <= Math.round(value) ? "fill-current" : "text-ink/15"}`} />)}
    </span>
  );
}

/** Avis des membres : note globale, répartition, photos, filtres, avis détaillés et questions posées après chaque expérience. */
export default async function ReviewsPage({ params, searchParams }: PageProps<"/[locale]/avis">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const [t, te, loc, all, experiences, categories] = await Promise.all([getTranslations("reviewsPage"), getTranslations("emptyStates"), getLocale(), getAllReviews(), getPublishedExperiences(), getCategories()]);
  const expById = new Map(experiences.map((e) => [e.id, e]));
  const catById = new Map(categories.map((c) => [c.id, c]));
  const category = typeof sp.univers === "string" && catById.has(sp.univers) ? sp.univers : undefined;
  const note = typeof sp.note === "string" && /^[1-5]$/.test(sp.note) ? Number(sp.note) : undefined;
  const sort: Sort = typeof sp.tri === "string" && (SORTS as readonly string[]).includes(sp.tri) ? (sp.tri as Sort) : "recent";
  const showAll = sp.tout === "1";

  const total = all.length;
  const overall = avg(all.map((r) => r.rating)) ?? 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: all.filter((r) => r.rating === n).length }));
  const again = all.filter((r) => typeof r.comeAgain === "boolean");
  const againPct = again.length ? Math.round((again.filter((r) => r.comeAgain).length / again.length) * 100) : null;
  const detailAvg = Object.fromEntries(REVIEW_DETAIL_KEYS.map((k) => [k, avg(all.map((r) => r.details?.[k]).filter((v): v is number => typeof v === "number"))]));
  const photos = all.filter((r) => r.photo?.status === "approved" && r.photo.path).slice(0, 12);

  const catOf = (r: Review) => expById.get(r.experienceId)?.categoryId;
  const filtered = all
    .filter((r) => (!category || catOf(r) === category) && (!note || r.rating === note))
    .sort((a, b) => (sort === "best" ? b.rating - a.rating : sort === "worst" ? a.rating - b.rating : 0) || b.createdAt.localeCompare(a.createdAt));
  const shown = showAll ? filtered : filtered.slice(0, PAGE);
  const href = (change: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const next = { univers: category, note: note ? String(note) : undefined, tri: sort === "recent" ? undefined : sort, ...change };
    for (const [k, v] of Object.entries(next)) if (v) q.set(k, v);
    const s = q.toString();
    return `/avis${s ? `?${s}` : ""}`;
  };
  const chip = (on: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:ring-brand-200"}`;
  const usedCats = categories.filter((c) => all.some((r) => catOf(r) === c.id));

  return (
    <PageShell className="max-w-5xl space-y-10 py-10 lg:max-w-6xl">
      <header className="text-center">
        <p className="eyebrow text-brand-700">{t("eyebrow")}</p>
        <h1 className="page-title mt-2">
          {t("titleA")} <em className="text-brand-700">{t("titleB")}</em>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[17px] text-muted">{t("intro")}</p>
      </header>

      {total === 0 ? (
        <EmptyState bab="toast" prop="stars" titleAs="h2" title={te("reviewsTitle")} text={t("empty")} />
      ) : (
        <>
          <section aria-labelledby="overall-title" className={photos.length > 0 ? "grid gap-4 md:grid-cols-[1.1fr_1fr]" : "mx-auto w-full max-w-xl"}>
            <div className="card flex flex-col justify-center p-6 sm:p-8" data-testid="reviews-overall">
              <h2 id="overall-title" className="sr-only">{t("overallTitle")}</h2>
              <div className="flex items-end gap-4">
                <span className="font-display text-7xl leading-none font-medium text-ink">{overall.toFixed(1)}</span>
                <span className="pb-2 text-[15px] leading-tight text-ink">{t("overallRating")}</span>
              </div>
              <div className="mt-3"><StarsRow value={overall} size="size-6" /></div>
              <p className="mt-2 text-[15px] text-ink/75">{t("fromCount", { count: total })}</p>
              <ul className="mt-5 space-y-2" aria-label={t("distribution")}>
                {dist.map((d) => (
                  <li key={d.n} className="flex items-center gap-3 text-sm">
                    <span className="flex w-8 items-center gap-1 font-semibold text-ink">{d.n}<Star className="size-3.5 fill-[#e3a32e] text-[#e3a32e]" aria-hidden /></span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/70">
                      <span className="block h-full rounded-full bg-[#e3a32e]" style={{ width: `${total ? (d.count / total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-8 text-end text-ink/75">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
            {photos.length > 0 && (
              <div className="rounded-3xl bg-white p-5 shadow-card" data-testid="reviews-photos">
                <h2 className="card-title">{t("photosTitle")}</h2>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {photos.slice(0, 4).map((r) => (
                    <li key={r.id} className="relative aspect-square overflow-hidden rounded-2xl">
                      <Image src={r.photo!.path} alt={t("photoAlt", { name: r.publicName })} fill sizes="(min-width: 768px) 14rem, 45vw" className="object-cover" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section aria-labelledby="all-title" className="space-y-5">
            <h2 id="all-title" className="section-title">{t("allTitle")}</h2>
            {/* Une seule barre de filtres : univers (s'il y en a plusieurs), note, puis tri à droite. */}
            <div className="flex flex-wrap items-center gap-2">
              {usedCats.length > 1 && (
                <span className="flex flex-wrap items-center gap-2 border-line pe-2 sm:border-e" role="group" aria-label={t("filterUniverse")}>
                  <Link href={href({ univers: undefined, tout: undefined })} className={`${chip(!category)} px-3 py-1.5`} aria-current={!category ? "true" : undefined}>{t("all")} <span className="opacity-70">{total}</span></Link>
                  {usedCats.map((c) => (
                    <Link key={c.id} href={href({ univers: c.id, tout: undefined })} className={`${chip(category === c.id)} px-3 py-1.5`} aria-current={category === c.id ? "true" : undefined}>{tr(c.shortName, loc)}</Link>
                  ))}
                </span>
              )}
              <span className="text-sm text-muted">{t("filterRating")}</span>
              {[undefined, 5, 4, 3, 2, 1].map((n) => (
                <Link key={n ?? "all"} href={href({ note: n ? String(n) : undefined, tout: undefined })} className={`${chip(note === n)} px-3 py-1.5`} aria-current={note === n ? "true" : undefined}>
                  {n ? <>{n}<Star className="size-3.5 fill-current" aria-hidden /></> : t("anyRating")}
                </Link>
              ))}
              {/* Tri en petit menu (« Trier : Récents ▾ ») : toute la barre de filtres tient sur une ligne. */}
              <details className="group relative ms-auto text-sm" data-testid="reviews-sort">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ring-line hover:ring-brand-200 [&::-webkit-details-marker]:hidden">
                  <span className="text-muted">{t("sortLabel")}</span>
                  <span className="font-semibold text-ink">{t(`sort_${sort}`)}</span>
                  <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="absolute end-0 z-30 mt-2 w-48 rounded-2xl border border-line bg-white p-1.5 shadow-float">
                  {SORTS.map((s) => (
                    <li key={s}>
                      <Link href={href({ tri: s === "recent" ? undefined : s, tout: undefined })} className={`block rounded-xl px-3 py-2 ${sort === s ? "bg-brand-50 font-semibold text-brand-900" : "text-ink hover:bg-cream"}`} aria-current={sort === s ? "true" : undefined}>{t(`sort_${s}`)}</Link>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            {filtered.length === 0 ? (
              <EmptyState variant="compact" bab="memo" mood="surprised" text={t("noMatch")} />
            ) : (
              <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="reviews-list">
                {shown.map((r, i) => {
                  const exp = expById.get(r.experienceId);
                  const cat = exp ? catById.get(exp.categoryId) : undefined;
                  const long = r.comment.length > 200;
                  return (
                    <li key={r.id} className="flex min-w-0 flex-col rounded-3xl bg-white p-5 shadow-card ring-1 ring-line/60" data-testid="review-card">
                      <div className="flex items-start gap-3">
                        <span className={`grid size-11 shrink-0 place-items-center rounded-full text-lg font-semibold ${AVATARS[i % AVATARS.length]}`} aria-hidden>{r.publicName.charAt(0)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink">{r.publicName}</p>
                          <p className="truncate text-sm text-muted">
                            {[cat ? tr(cat.shortName, loc) : null, exp ? tr(exp.title, loc) : null].filter(Boolean).join(" · ")}
                          </p>
                          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
                            <StarsRow value={r.rating} />
                            <span className="sr-only">{t("ratingOf", { value: r.rating })}</span>
                            <span>{formatCalendarDate(r.createdAt.slice(0, 10), locale)}</span>
                          </p>
                        </div>
                      </div>
                      {r.comment &&
                        (long ? (
                          <details className="group mt-3 text-[15px] leading-relaxed text-ink/85">
                            <summary className="cursor-pointer list-none">
                              <span className="group-open:hidden">{r.comment.slice(0, 190).trimEnd()}… <span className="font-semibold text-brand-900 underline underline-offset-4">{t("readMore")}</span></span>
                              <span className="hidden group-open:inline">{r.comment}</span>
                            </summary>
                          </details>
                        ) : (
                          <p className="mt-3 text-[15px] leading-relaxed text-ink/85">{r.comment}</p>
                        ))}
                      {r.photo?.status === "approved" && r.photo.path && (
                        <div className="relative mt-3 h-36 overflow-hidden rounded-2xl">
                          <Image src={r.photo.path} alt={t("photoAlt", { name: r.publicName })} fill sizes="(min-width: 1024px) 18rem, 90vw" className="object-cover" />
                        </div>
                      )}
                      {r.details && Object.values(r.details).some((v) => typeof v === "number") && (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {REVIEW_DETAIL_KEYS.filter((k) => typeof r.details?.[k] === "number").map((k) => (
                            <li key={k} className="rounded-full bg-cream px-2.5 py-1 text-xs text-ink/75">{t(`detail_${k}`)} <b className="text-ink">{r.details![k]}</b></li>
                          ))}
                        </ul>
                      )}
                      {r.reply && (
                        <div className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm">
                          <p className="font-semibold text-ink">{t("replyFrom", { name: r.reply.authorName })}</p>
                          <p className="mt-1 text-ink/80">{r.reply.text}</p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {!showAll && filtered.length > PAGE && (
              <Link href={href({ tout: "1" })} className="block w-full rounded-full border-2 border-ink px-6 py-3.5 text-center font-semibold text-ink hover:bg-ink hover:text-white">{t("showAll", { count: filtered.length })}</Link>
            )}
          </section>

          <section aria-labelledby="questions-title" className="space-y-4">
            <h2 id="questions-title" className="section-title">{t("questionsTitle")}</h2>
            <p className="text-center text-muted">{t("questionsIntro")}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: t("qExperience"), rows: [{ label: t("qGroup"), value: detailAvg.group }, { label: t("qOrganisation"), value: detailAvg.organisation }] },
                { title: t("qVenue"), rows: [{ label: t("qVenueItself"), value: detailAvg.venue }] },
                { title: t("qOverall"), rows: [{ label: t("qComeAgain"), value: againPct, pct: true }, { label: t("qOverallRating"), value: overall }] },
              ].map((card) => (
                <div key={card.title} className="card p-6" data-testid="reviews-question-card">
                  <h3 className="card-title">{card.title}</h3>
                  <dl className="mt-3 divide-y divide-ink/10">
                    {card.rows.map((row) => (
                      <div key={row.label} className="flex items-baseline justify-between gap-3 py-3">
                        <dt className="text-[15px] text-ink/85">{row.label}</dt>
                        <dd className="card-title">
                          {row.value == null ? <span className="text-base text-muted">—</span> : "pct" in row && row.pct ? <>{row.value} %<span className="ms-1 text-sm font-sans text-muted">{t("saidYes")}</span></> : Number(row.value).toFixed(1)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="rounded-3xl bg-cream-deep p-6 text-center sm:p-8">
        <h2 className="section-title">{t("ctaTitle")}</h2>
        <p className="mt-2 text-muted">{t("ctaText")}</p>
        <Link href="/espace/reservations" className="mt-5 inline-flex rounded-full border-2 border-ink px-6 py-3 font-semibold text-ink hover:bg-ink hover:text-white">{t("ctaButton")}</Link>
      </section>
    </PageShell>
  );
}
