import { ArrowRight, ChevronRight, Lightbulb, MapPin } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BLOG_CATEGORIES, blogLang, type BlogArticle, type BlogBlock, type BlogCategoryKey } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { richText } from "@/lib/rich-text";
import { Sparks } from "@/components/brand/doodles";
import { ActiveTabScroll } from "./active-tab-scroll";

const catTitle = (key: BlogCategoryKey, locale: string) => BLOG_CATEGORIES.find((c) => c.key === key)!.title[blogLang(locale)];

/** En-tête du blog : grande accroche avec la fin mise en couleur, puis l'introduction. */
export async function BlogHero({ as = "h1" }: { as?: "h1" | "p" }) {
  const t = await getTranslations("blog");
  const Title = as;
  return (
    <header className="max-w-3xl">
      <p className="eyebrow text-brand-700">{t("title")}</p>
      <Title className="page-title mt-3">
        {t("heroTitleA")} <span className="text-gradient">{t("heroTitleB")}</span>
      </Title>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink/80">{t("heroText")}</p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{t("intro")}</p>
    </header>
  );
}

/** Thèmes du blog en pastilles, qui défilent horizontalement sur mobile. */
export async function BlogTabs({ active, locale }: { active: BlogCategoryKey | "all"; locale: string }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const tabs = [{ href: "/blog", key: "all" as const, label: t("all") }, ...BLOG_CATEGORIES.map((c) => ({ href: `/blog/theme/${c.key}`, key: c.key, label: c.title[lang] }))];
  return (
    <ActiveTabScroll label={t("tabs")} className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition ${on ? "bg-brand-900 text-white shadow-card" : "border border-line bg-white text-ink hover:border-brand-700 hover:text-brand-900"}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </ActiveTabScroll>
  );
}

/** « Commencer ici » : grand article mis en avant. */
export async function FeaturedArticle({ a, locale }: { a: BlogArticle; locale: string }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  return (
    // Étape 7c (docs/29) : la photo « emboîtée » sur un fond pêche tourné, le texte à côté.
    <article className="group relative mt-10 grid items-center gap-8 md:grid-cols-[1.15fr_1fr] md:gap-12">
      <div className="relative mx-2 md:mx-0">
        <div aria-hidden className="absolute -inset-2.5 -rotate-2 rounded-[2.2rem] bg-peach transition duration-300 group-hover:-rotate-3" />
        <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] shadow-card">
          <Image src={a.cover} alt="" fill priority sizes="(min-width: 768px) 55vw, 100vw" className={`object-cover transition duration-500 group-hover:scale-[1.03] ${a.coverPosition ?? ""}`} />
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{t("startHere")}</span> · {catTitle(a.category, locale)} · {t("readTime", { minutes: a.minutes })}
        </p>
        <h2 className="section-title mt-3 text-start">
          <Link href={`/blog/${a.slug}`} className="after:absolute after:inset-0">{a.title[lang]}</Link>
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink/75">{a.excerpt[lang]}</p>
        <span aria-hidden className="mt-6 inline-flex items-center gap-2 font-semibold text-brand-900">
          {t("startHere")} <ArrowRight className="size-4 transition group-hover:translate-x-1 rtl:-scale-x-100" />
        </span>
      </div>
    </article>
  );
}

/** Liste compacte : vignette arrondie, titre, « thème · minutes ». */
export async function CompactList({ articles, locale, showTheme = true }: { articles: BlogArticle[]; locale: string; showTheme?: boolean }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  return (
    // Étape 7c (docs/29) : une carte blanche arrondie par article, comme les cartes du blog.
    <ul className="space-y-3 sm:space-y-4">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={`/blog/${a.slug}`} className="group flex items-center gap-4 rounded-[1.5rem] bg-white p-3 shadow-card transition hover:shadow-float sm:gap-6 sm:p-3.5">
            <span className="relative size-24 shrink-0 overflow-hidden rounded-[1.1rem] sm:size-28">
              <Image src={a.cover} alt="" fill sizes="112px" className={`object-cover transition duration-500 group-hover:scale-105 ${a.coverPosition ?? ""}`} />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] leading-snug font-semibold text-ink group-hover:text-brand-900 sm:text-xl">{a.title[lang]}</span>
              <span className="mt-1.5 block text-sm text-muted">
                {showTheme && <>{catTitle(a.category, locale)} · </>}
                {t("readTime", { minutes: a.minutes })}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Bloc blanc « Utile aussi » : quelques articles en liste, avec une flèche ronde. */
export async function UsefulAlso({ articles, locale, title }: { articles: BlogArticle[]; locale: string; title?: string }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  if (!articles.length) return null;
  return (
    <section aria-labelledby="useful-also" className="mt-14 rounded-[1.75rem] bg-white p-6 shadow-card sm:p-8">
      <h2 id="useful-also" className="text-lg font-semibold text-ink">{title ?? t("usefulAlso")}</h2>
      <ul className="mt-2 divide-y divide-line">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/blog/${a.slug}`} className="group flex items-center justify-between gap-4 py-5">
              <span className="min-w-0">
                <span className="block text-[17px] leading-snug font-semibold text-ink group-hover:text-brand-900 sm:text-xl">{a.title[lang]}</span>
                <span className="mt-1 block text-sm text-muted">{catTitle(a.category, locale)} · {t("readTime", { minutes: a.minutes })}</span>
              </span>
              <span aria-hidden className="bub-lilac grid size-11 shrink-0 place-items-center rounded-full text-ink transition group-hover:bg-brand-900 group-hover:bg-none group-hover:text-white">
                <ChevronRight className="size-5 rtl:rotate-180" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Carte « Rencontrer du monde à Casablanca » (pages de thème). */
export async function CityCard() {
  const t = await getTranslations("blog");
  return (
    <aside className="relative mt-8 overflow-hidden rounded-[2rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] p-6 sm:p-10">
      <Sparks className="absolute end-6 top-5 w-11 rotate-12" />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-card">
        <MapPin className="size-4" aria-hidden /> Casablanca
      </span>
      <h2 className="section-title mt-4 text-start">{t("cityCardTitle")}</h2>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink/75">{t("cityCardText")}</p>
      <div className="mt-6 grid gap-3 sm:flex">
        <Link href="/experiences" className="btn btn-primary">
          {t("findGroup")}
        </Link>
        <Link href="/#villes" className="btn btn-secondary">
          {t("otherCity")}
        </Link>
      </div>
    </aside>
  );
}

/** Corps d'un article : paragraphes, intertitres, listes, encadrés. */
export function ArticleBody({ blocks, summaryLabel }: { blocks: BlogBlock[]; summaryLabel: string }) {
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-ink/85">
      {blocks.map((b, i) => {
        if (typeof b === "string") return <p key={i}>{richText(b, "")}</p>;
        if (Array.isArray(b)) return <ul key={i} className="list-disc space-y-2 ps-5 marker:text-brand-700">{b.map((li, k) => <li key={k}>{richText(li, "")}</li>)}</ul>;
        if ("h" in b) return <h2 key={i} className="pt-4 font-display text-[1.6rem] leading-tight font-semibold text-brand-900 sm:text-3xl">{b.h}</h2>;
        if ("ol" in b) return <ol key={i} className="list-decimal space-y-3 ps-6 marker:font-semibold marker:text-brand-700">{b.ol.map((li, k) => <li key={k} className="ps-1">{richText(li, "")}</li>)}</ol>;
        if ("summary" in b) {
          return (
            <section key={i} aria-label={summaryLabel} className="rounded-[1.75rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] p-6 sm:p-7" data-testid="article-summary">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{summaryLabel}</p>
              <ul className="mt-2 list-disc space-y-1.5 ps-5 text-[16px] text-ink marker:text-brand-700">{b.summary.map((li, k) => <li key={k}>{richText(li, "")}</li>)}</ul>
            </section>
          );
        }
        return (
          <aside key={i} className="flex gap-4 rounded-[1.5rem] bg-white p-5 text-ink shadow-card ring-1 ring-line/60">
            <span aria-hidden className="bub-peach grid size-10 shrink-0 place-items-center rounded-full"><Lightbulb className="size-5 text-[#b8381f]" strokeWidth={1.8} /></span>
            <p>{richText(b.tip, "")}</p>
          </aside>
        );
      })}
    </div>
  );
}

/** Appel à l'action vers les expériences. */
export async function BlogCta() {
  const t = await getTranslations("blog");
  return (
    <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] px-6 py-12 text-center sm:px-10 lg:mt-24">
      <Sparks className="absolute start-6 top-5 w-11 -rotate-12" />
      <h2 className="section-title">{t("ctaTitle")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-muted">{t("ctaText")}</p>
      <Link href="/experiences" className="btn btn-primary mt-6 min-h-11">
        {t("ctaButton")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </section>
  );
}

