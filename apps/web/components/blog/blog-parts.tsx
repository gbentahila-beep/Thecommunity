import { ArrowRight, Clock, Lightbulb } from "lucide-react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BLOG_CATEGORIES, blogLang, type BlogArticle, type BlogBlock, type BlogCategoryKey } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { richText } from "@/lib/rich-text";

/** En-tête du blog : grande accroche + texte d'introduction. */
export async function BlogHero({ as = "h1" }: { as?: "h1" | "p" }) {
  const t = await getTranslations("blog");
  const Title = as;
  return (
    <header className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold tracking-[0.18em] text-plum-700 uppercase">{t("title")}</p>
      <Title className="mt-3 font-display text-[2.4rem] leading-[1.05] font-medium text-plum-900 sm:text-6xl">{t("heroTitle")}</Title>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink/80">{t("heroText")}</p>
      <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{t("intro")}</p>
    </header>
  );
}

/** Onglets du blog (liens) : défilement horizontal sur mobile. */
export async function BlogTabs({ active, locale }: { active: BlogCategoryKey | "all"; locale: string }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const tabs = [{ href: "/blog", key: "all" as const, label: t("all") }, ...BLOG_CATEGORIES.map((c) => ({ href: `/blog/theme/${c.key}`, key: c.key, label: c.title[lang] }))];
  return (
    <nav aria-label={t("tabs")} className="-mx-4 mt-10 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:mx-auto sm:w-auto sm:flex-wrap sm:justify-center">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold whitespace-nowrap transition ${on ? "bg-plum-900 text-white shadow-card" : "border border-line bg-white text-ink/80 hover:border-plum-700 hover:text-plum-900"}`}
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

export async function ArticleCard({ a, locale, priority = false }: { a: BlogArticle; locale: string; priority?: boolean }) {
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const cat = BLOG_CATEGORIES.find((c) => c.key === a.category)!;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image src={a.cover} alt="" fill priority={priority} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw" className="object-cover transition duration-500 group-hover:scale-[1.04]" />
      </div>
      <div className="flex flex-1 flex-col p-5" lang={locale === "ar" ? "fr" : undefined} dir={locale === "ar" ? "ltr" : undefined}>
        <p className="text-xs font-semibold tracking-wide text-plum-700 uppercase">{cat.title[lang]}</p>
        <h3 className="mt-2 font-display text-xl leading-snug font-medium text-plum-900">
          <Link href={`/blog/${a.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">{a.title[lang]}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink/75">{a.excerpt[lang]}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-4 text-sm text-muted">
          <Clock className="size-4" aria-hidden />
          {t("readTime", { minutes: a.minutes })}
        </p>
      </div>
    </article>
  );
}

export async function ArticleGrid({ articles, locale }: { articles: BlogArticle[]; locale: string }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a, i) => (
        <li key={a.slug}>
          <ArticleCard a={a} locale={locale} priority={i < 3} />
        </li>
      ))}
    </ul>
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
    <section className="mt-16 rounded-[2rem] bg-plum-900 px-6 py-10 text-center text-white sm:px-10">
      <h2 className="font-display text-3xl font-medium">{t("ctaTitle")}</h2>
      <p className="mx-auto mt-3 max-w-xl text-white/80">{t("ctaText")}</p>
      <Link href="/experiences" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-6 font-semibold text-plum-900 transition hover:bg-cream">
        {t("ctaButton")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </section>
  );
}

