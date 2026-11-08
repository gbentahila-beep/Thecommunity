import { ArrowRight, ChevronRight, Lightbulb, MapPin } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BLOG_CATEGORIES, blogLang, type BlogArticle, type BlogBlock, type BlogCategoryKey } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { richText } from "@/lib/rich-text";

const catTitle = (key: BlogCategoryKey, locale: string) => BLOG_CATEGORIES.find((c) => c.key === key)!.title[blogLang(locale)];

/** En-tête du blog : grande accroche avec la fin mise en couleur, puis l'introduction. */
export async function BlogHero({ as = "h1" }: { as?: "h1" | "p" }) {
  const t = await getTranslations("blog");
  const Title = as;
  return (
    <header className="max-w-3xl">
      <p className="text-sm font-semibold tracking-[0.18em] text-plum-700 uppercase">{t("title")}</p>
      <Title className="mt-3 font-display text-[2.6rem] leading-[1.02] font-medium tracking-tight text-plum-900 sm:text-6xl lg:text-7xl">
        {t("heroTitleA")} <span className="bg-gradient-to-r from-plum-500 to-[#c9705f] bg-clip-text text-transparent italic rtl:not-italic">{t("heroTitleB")}</span>
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
    <nav aria-label={t("tabs")} className="-mx-4 mt-8 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-12 items-center rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition ${on ? "bg-plum-900 text-white shadow-card" : "border border-line bg-white text-ink hover:border-plum-700 hover:text-plum-900"}`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** « Commencer ici » : grand article mis en avant. */
export async function FeaturedArticle({ a, locale }: { a: BlogArticle; locale: string }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  return (
    <article className="group relative mt-8 grid overflow-hidden rounded-[2rem] bg-white shadow-card md:grid-cols-[1.15fr_1fr]">
      <div className="relative aspect-[16/11] overflow-hidden md:aspect-auto md:min-h-[22rem]">
        <Image src={a.cover} alt="" fill priority sizes="(min-width: 768px) 55vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{t("startHere")}</span> · {catTitle(a.category, locale)} · {t("readTime", { minutes: a.minutes })}
        </p>
        <h2 className="mt-3 font-display text-[1.85rem] leading-tight font-medium text-plum-900 sm:text-4xl">
          <Link href={`/blog/${a.slug}`} className="after:absolute after:inset-0">{a.title[lang]}</Link>
        </h2>
        <p className="mt-3 text-[16px] leading-relaxed text-ink/75">{a.excerpt[lang]}</p>
        <span aria-hidden className="mt-6 inline-flex items-center gap-2 font-semibold text-plum-900">
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
    <ul className="divide-y divide-line border-y border-line">
      {articles.map((a) => (
        <li key={a.slug}>
          <Link href={`/blog/${a.slug}`} className="group flex items-center gap-4 py-4 sm:gap-6 sm:py-5">
            <span className="relative size-24 shrink-0 overflow-hidden rounded-2xl sm:size-28">
              <Image src={a.cover} alt="" fill sizes="112px" className="object-cover transition duration-500 group-hover:scale-105" />
            </span>
            <span className="min-w-0">
              <span className="block text-[17px] leading-snug font-semibold text-ink group-hover:text-plum-900 sm:text-xl">{a.title[lang]}</span>
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
    <section aria-labelledby="useful-also" className="mt-14 rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
      <h2 id="useful-also" className="text-lg font-semibold text-ink">{title ?? t("usefulAlso")}</h2>
      <ul className="mt-2 divide-y divide-line">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/blog/${a.slug}`} className="group flex items-center justify-between gap-4 py-5">
              <span className="min-w-0">
                <span className="block text-[17px] leading-snug font-semibold text-ink group-hover:text-plum-900 sm:text-xl">{a.title[lang]}</span>
                <span className="mt-1 block text-sm text-muted">{catTitle(a.category, locale)} · {t("readTime", { minutes: a.minutes })}</span>
              </span>
              <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-deep text-ink transition group-hover:bg-plum-900 group-hover:text-white">
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
    <aside className="mt-8 rounded-[2rem] bg-white p-6 shadow-card sm:p-8">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-deep px-3 py-1.5 text-sm font-semibold text-ink">
        <MapPin className="size-4" aria-hidden /> Casablanca
      </span>
      <h2 className="mt-4 font-display text-[2rem] leading-tight font-medium text-plum-900 sm:text-4xl">{t("cityCardTitle")}</h2>
      <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink/75">{t("cityCardText")}</p>
      <div className="mt-6 grid gap-3 sm:flex">
        <Link href="/experiences" className="inline-flex min-h-12 items-center justify-center rounded-full bg-plum-900 px-6 font-semibold text-white shadow-card transition hover:bg-plum-800">
          {t("findGroup")}
        </Link>
        <Link href="/#villes" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line bg-white px-6 font-semibold text-ink transition hover:border-plum-700">
          {t("otherCity")}
        </Link>
      </div>
    </aside>
  );
}

/** Corps d'un article : paragraphes, intertitres, listes, encadrés. */
export function ArticleBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-ink/85">
      {blocks.map((b, i) => {
        if (typeof b === "string") return <p key={i}>{richText(b, "")}</p>;
        if (Array.isArray(b)) return <ul key={i} className="list-disc space-y-2 ps-5 marker:text-plum-700">{b.map((li, k) => <li key={k}>{richText(li, "")}</li>)}</ul>;
        if ("h" in b) return <h2 key={i} className="pt-4 font-display text-2xl font-medium text-plum-900 sm:text-3xl">{b.h}</h2>;
        if ("ol" in b) return <ol key={i} className="list-decimal space-y-3 ps-6 marker:font-semibold marker:text-plum-700">{b.ol.map((li, k) => <li key={k} className="ps-1">{richText(li, "")}</li>)}</ol>;
        return (
          <aside key={i} className="flex gap-3 rounded-2xl bg-plum-50 p-5 text-plum-900">
            <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
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
    <section className="mt-16 rounded-[2rem] bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] px-6 py-10 text-center text-white sm:px-10">
      <h2 className="font-display text-3xl font-medium">{t("ctaTitle")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-white/80">{t("ctaText")}</p>
      <Link href="/experiences" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 font-semibold text-plum-900 transition hover:bg-cream">
        {t("ctaButton")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </section>
  );
}

