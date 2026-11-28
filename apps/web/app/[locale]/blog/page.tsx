import { Sparks } from "@/components/brand/doodles";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogBrowser, type BrowseEntry } from "@/components/blog/blog-browser";
import { BlogCta, BlogHero, BlogTabs, FeaturedArticle } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { articleBySlug, BLOG_ARTICLES, BLOG_CATEGORIES, blogLang, byPopularity, byRecency, START_HERE, type BlogArticle } from "@/content/blog";

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
  const entry = (a: BlogArticle): BrowseEntry => ({
    slug: a.slug,
    title: a.title[lang],
    excerpt: a.excerpt[lang],
    theme: BLOG_CATEGORIES.find((c) => c.key === a.category)!.title[lang],
    minutes: a.minutes,
    cover: a.cover,
    coverPosition: a.coverPosition,
  });
  return (
    // Étape 7c (docs/29, piste A) : halos pêche et lilas, petits traits corail.
    <div className="halo-top relative">
    <Sparks className="pointer-events-none absolute end-6 top-6 w-12 sm:end-[8%] sm:top-10 sm:w-14" />
    <PageShell className="page-header relative">
      <div className="">
      <BlogHero />
      <BlogTabs active="all" locale={locale} />
      <FeaturedArticle a={featured} locale={locale} />
      <div className="mt-16 lg:mt-24">
        <section aria-labelledby="browse">
          <h2 id="browse" className="section-title mb-6">{t("browse")}</h2>
          <BlogBrowser popular={byPopularity(BLOG_ARTICLES).map(entry)} recent={byRecency(BLOG_ARTICLES).map(entry)} />
        </section>
      </div>
      <BlogCta />
    </div>
    </PageShell>
    </div>
  );
}
