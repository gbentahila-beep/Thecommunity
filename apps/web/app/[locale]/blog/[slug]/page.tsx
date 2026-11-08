import { ChevronRight, Clock } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleBody, BlogCta, UsefulAlso } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { articleBySlug, articlesIn, BLOG_ARTICLES, blogCategory, blogLang, byPopularity } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatCalendarDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BLOG_ARTICLES.map((a) => ({ locale, slug: a.slug })));
}

const pathOf = (locale: string, slug: string) => `${locale === "fr" ? "" : `/${locale}`}/blog/${slug}`;

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = articleBySlug(slug);
  if (!a) return {};
  const lang = blogLang(locale);
  return {
    title: a.title[lang],
    description: a.excerpt[lang],
    alternates: { canonical: pathOf(locale, slug) },
    openGraph: { type: "article", title: a.title[lang], description: a.excerpt[lang], images: [a.cover], publishedTime: a.date },
  };
}

export default async function BlogArticlePage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = articleBySlug(slug);
  if (!a) notFound();
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const cat = blogCategory(a.category)!;
  const sameTheme = byPopularity(articlesIn(a.category)).filter((x) => x.slug !== a.slug);
  const related = [...sameTheme, ...byPopularity(BLOG_ARTICLES).filter((x) => x.category !== a.category)].slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: a.title[lang],
    description: a.excerpt[lang],
    datePublished: a.date,
    image: `${SITE_URL}${a.cover}`,
    inLanguage: lang,
    mainEntityOfPage: `${SITE_URL}${pathOf(locale, slug)}`,
    publisher: { "@type": "Organization", name: "The Host Club" },
  };
  return (
    <PageShell className="py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-3xl">
        <nav aria-label={t("breadcrumb")} className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/blog" className="hover:text-plum-900 hover:underline">{t("title")}</Link></li>
            <li aria-hidden><ChevronRight className="size-3.5 rtl:rotate-180" /></li>
            <li><Link href={`/blog/theme/${cat.key}`} className="hover:text-plum-900 hover:underline">{cat.title[lang]}</Link></li>
          </ol>
        </nav>
        <article className="mt-6">
          <h1 className="font-display text-[2.2rem] leading-[1.1] font-medium text-plum-900 sm:text-5xl">{a.title[lang]}</h1>
          <p className="mt-4 text-lg leading-relaxed text-ink/80">{a.excerpt[lang]}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{t("readTime", { minutes: a.minutes })}</span>
            <time dateTime={a.date}>{formatCalendarDate(a.date, locale)}</time>
          </p>
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[2rem] shadow-card">
            <Image src={a.cover} alt="" fill priority sizes="(min-width: 768px) 768px, 100vw" className="object-cover" />
          </div>
          <div className="mt-8">
            <ArticleBody blocks={a.body[lang]} />
          </div>
        </article>
      </div>
      <div className="mx-auto max-w-3xl">
        <UsefulAlso articles={related} locale={locale} title={t("related")} />
      </div>
      <BlogCta />
    </PageShell>
  );
}
