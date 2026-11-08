import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleGrid, BlogCta, BlogHero, BlogTabs } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { BLOG_ARTICLES } from "@/content/blog";

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  return { title: `${t("title")} · ${t("heroTitle")}`, description: t("heroText"), alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/blog` } };
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  return (
    <PageShell className="py-12 sm:py-16">
      <BlogHero />
      <BlogTabs active="all" locale={locale} />
      <h2 className="sr-only">{t("all")}</h2>
      <p className="mt-8 mb-5 text-sm text-muted">{t("count", { count: BLOG_ARTICLES.length })}</p>
      <ArticleGrid articles={BLOG_ARTICLES} locale={locale} />
      <BlogCta />
    </PageShell>
  );
}
