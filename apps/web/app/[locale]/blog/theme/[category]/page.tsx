import { ChevronDown, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BlogCta, BlogTabs, CityCard, CompactList, UsefulAlso } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { articleBySlug, articlesIn, BLOG_CATEGORIES, blogCategory, blogLang, byPopularity, CITY_GUIDE_FAQ, lastUpdate, MOST_READ } from "@/content/blog";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { formatCalendarDate } from "@/lib/format";
import { plainText, richText } from "@/lib/rich-text";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BLOG_CATEGORIES.map((c) => ({ locale, category: c.key })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/theme/[category]">): Promise<Metadata> {
  const { locale, category } = await params;
  const c = blogCategory(category);
  if (!c) return {};
  const lang = blogLang(locale);
  const t = await getTranslations({ locale, namespace: "blog" });
  return { title: `${c.title[lang]} · ${t("title")}`, description: c.description[lang], alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/blog/theme/${c.key}` } };
}

export default async function BlogCategoryPage({ params }: PageProps<"/[locale]/blog/theme/[category]">) {
  const { locale, category } = await params;
  setRequestLocale(locale);
  const c = blogCategory(category);
  if (!c) notFound();
  const t = await getTranslations("blog");
  const lang = blogLang(locale);
  const articles = byPopularity(articlesIn(c.key));
  const others = MOST_READ.flatMap((s) => (articleBySlug(s) && articleBySlug(s)!.category !== c.key ? [articleBySlug(s)!] : [])).slice(0, 3);
  const faq = c.key === "city-guide" ? CITY_GUIDE_FAQ : [];
  const jsonLd = faq.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q[lang], acceptedAnswer: { "@type": "Answer", text: plainText(f.a[lang]) } })) }
    : null;
  return (
    <PageShell className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <nav aria-label={t("breadcrumb")} className="text-[15px]">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/blog" className="font-semibold text-ink hover:underline">{t("title")}</Link></li>
            <li aria-hidden><ChevronRight className="size-4 text-muted rtl:rotate-180" /></li>
            <li className="text-muted" aria-current="page">{c.title[lang]}</li>
          </ol>
        </nav>
        <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] font-medium tracking-tight text-plum-900 sm:text-6xl">{c.title[lang]}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/75">{c.description[lang]}</p>
        <p className="mt-4 text-[15px] text-muted">
          {t("count", { count: articles.length })} · {t("updatedOn", { date: formatCalendarDate(lastUpdate(articles), locale) })}
        </p>
        {c.key === "city-guide" && <CityCard />}
        <BlogTabs active={c.key} locale={locale} />
        <div className="mt-6">
          <CompactList articles={articles} locale={locale} showTheme={false} />
        </div>
        {faq.length > 0 && (
          <section aria-labelledby="blog-faq" className="mt-16">
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
            <h2 id="blog-faq" className="font-display text-[2.2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{t("faqTitle")}</h2>
            <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
              {faq.map((f) => (
                <details key={f.q.fr} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q[lang]}
                    <ChevronDown className="size-5 shrink-0 text-plum-700 transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 leading-relaxed text-ink/80">{richText(f.a[lang], "")}</p>
                </details>
              ))}
            </div>
          </section>
        )}
        <UsefulAlso articles={others} locale={locale} />
      </div>
      <BlogCta />
    </PageShell>
  );
}
