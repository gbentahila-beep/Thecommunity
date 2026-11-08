import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArticleGrid, BlogCta, BlogHero, BlogTabs } from "@/components/blog/blog-parts";
import { PageShell } from "@/components/ui";
import { articlesIn, BLOG_CATEGORIES, blogCategory, blogLang, CITY_GUIDE_FAQ } from "@/content/blog";
import { routing } from "@/i18n/routing";
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
  const articles = articlesIn(c.key);
  const faq = c.key === "city-guide" ? CITY_GUIDE_FAQ : [];
  const jsonLd = faq.length
    ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q[lang], acceptedAnswer: { "@type": "Answer", text: plainText(f.a[lang]) } })) }
    : null;
  return (
    <PageShell className="py-12 sm:py-16">
      <BlogHero as="p" />
      <BlogTabs active={c.key} locale={locale} />
      <div className="mx-auto mt-10 mb-8 max-w-2xl text-center">
        <h1 className="font-display text-3xl font-medium text-plum-900 sm:text-4xl">{c.title[lang]}</h1>
        <p className="mt-3 text-ink/75">{c.description[lang]}</p>
        <p className="mt-2 text-sm text-muted">{t("count", { count: articles.length })}</p>
      </div>
      <ArticleGrid articles={articles} locale={locale} />
      {faq.length > 0 && (
        <section aria-labelledby="blog-faq" className="mx-auto mt-16 max-w-3xl">
          {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
          <h2 id="blog-faq" className="text-center font-display text-3xl font-medium text-plum-900">{t("faqTitle")}</h2>
          {locale === "ar" && <p className="mt-6 rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-900">{t("arabicPending")}</p>}
          <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card" lang={locale === "ar" ? "fr" : undefined} dir={locale === "ar" ? "ltr" : undefined}>
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
      <BlogCta />
    </PageShell>
  );
}
