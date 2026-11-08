import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HelpFeedback } from "@/components/help/help-feedback";
import { HelpContactCards } from "@/components/help/help-hub";
import { PageShell } from "@/components/ui";
import { articleBySlug, categoryOf, HELP_ARTICLES, helpLang } from "@/content/help";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { richText } from "@/lib/rich-text";

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => HELP_ARTICLES.map((a) => ({ locale, slug: a.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/aide/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = articleBySlug(slug);
  if (!a) return {};
  const lang = helpLang(locale);
  return { title: a.title[lang], description: a.summary[lang], alternates: { canonical: `${locale === "fr" ? "" : `/${locale}`}/aide/${slug}` } };
}

export default async function HelpArticlePage({ params }: PageProps<"/[locale]/aide/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = articleBySlug(slug);
  if (!a) notFound();
  const t = await getTranslations("help");
  const lang = helpLang(locale);
  const cat = categoryOf(a.category);
  const hub = cat.audience === "partners" ? "/aide/partenaires" : "/aide";
  const missing = t("missing");
  const relatedSlugs = a.related?.length ? a.related : HELP_ARTICLES.filter((x) => x.category === a.category && x.slug !== a.slug).map((x) => x.slug);
  const related = relatedSlugs.flatMap((s) => (articleBySlug(s) ? [articleBySlug(s)!] : []));
  return (
    <PageShell className="max-w-3xl py-10">
      <nav aria-label={t("breadcrumb")} className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href={hub} className="hover:text-plum-900 hover:underline">{t("title")}</Link></li>
          <li aria-hidden><ChevronRight className="size-3.5 rtl:rotate-180" /></li>
          <li><Link href={`${hub}#${cat.key}`} className="hover:text-plum-900 hover:underline">{cat.title[lang]}</Link></li>
        </ol>
      </nav>
      <article className="mt-6">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{a.title[lang]}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/80">{a.summary[lang]}</p>
        <div className="mt-8 space-y-5">
          {a.body[lang].map((b, i) =>
            Array.isArray(b) ? (
              <ul key={i} className="list-disc space-y-2 ps-5 leading-relaxed text-ink/85">
                {b.map((li, k) => <li key={k}>{richText(li, missing)}</li>)}
              </ul>
            ) : (
              <p key={i} className="leading-relaxed text-ink/85">{richText(b, missing)}</p>
            ),
          )}
        </div>
      </article>
      {FIREBASE_ENABLED && (
        <div className="mt-10">
          <HelpFeedback article={a.slug} />
        </div>
      )}
      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related">
          <h2 id="related" className="font-display text-2xl font-medium text-plum-900">{t("related")}</h2>
          <ul className="mt-4 divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
            {related.map((r) => (
              <li key={r.slug}>
                <Link href={`/aide/${r.slug}`} className="block p-5 transition hover:bg-cream">
                  <span className="block font-semibold text-ink">{r.title[lang]}</span>
                  <span className="mt-1 block text-sm text-muted">{r.summary[lang]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <HelpContactCards audience={cat.audience} />
    </PageShell>
  );
}
