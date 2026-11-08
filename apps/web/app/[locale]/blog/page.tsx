import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogBrowser, type BrowseEntry } from "@/components/blog/blog-browser";
import { BlogCta, BlogHero, BlogTabs, CompactList, FeaturedArticle } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { articleBySlug, BLOG_ARTICLES, BLOG_CATEGORIES, blogLang, byPopularity, byRecency, MOST_READ, START_HERE, type BlogArticle } from "@/content/blog";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return { title: `${t("title")} · ${t("heroTitle")}`, description: t("heroText"), alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/blog` } };
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const featured = articleBySlug(START_HERE)!;
  const mostRead = MOST_READ.flatMap((s) => (articleBySlug(s) ? [articleBySlug(s)!] : []));
  const entry = (a: BlogArticle): BrowseEntry => ({
    slug: a.slug,
    title: a.title[lang],
    excerpt: a.excerpt[lang],
    theme: BLOG_CATEGORIES.find((c) => c.key === a.category)!.title[lang],
    minutes: a.minutes,
  });
  return (
    <PageShell className="py-10 sm:py-16">
      <BlogHero />
      <BlogTabs active="all" locale={locale} />
      <FeaturedArticle a={featured} locale={locale} />
      <div className="mx-auto mt-16 max-w-4xl">
        <section aria-labelledby="most-read">
          <h2 id="most-read" className="mb-5 font-display text-[2.2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{t("mostRead")}</h2>
          <CompactList articles={mostRead} locale={locale} />
        </section>
        <section aria-labelledby="browse" className="mt-16">
          <h2 id="browse" className="mb-6 font-display text-[2.2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{t("browse")}</h2>
          <BlogBrowser popular={byPopularity(BLOG_ARTICLES).map(entry)} recent={byRecency(BLOG_ARTICLES).map(entry)} contentLang={locale === "ar" ? "fr" : undefined} />
        </section>
      </div>
      <BlogCta />
    </PageShell>
  );
}
