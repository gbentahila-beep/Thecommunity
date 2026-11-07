import { ArrowRight, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { Link } from "@/i18n/navigation";

/** 10 questions au maximum (demande de Rita) ; le centre d'aide détaille le reste. */
const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export async function generateMetadata({ params }: PageProps<"/[locale]/faq">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("faqTitle") };
}

export default async function FaqPage({ params }: PageProps<"/[locale]/faq">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tf] = await Promise.all([getTranslations("pages"), getTranslations("faq")]);
  const items = KEYS.map((k) => ({ q: tf(`q${k}`), a: tf(`a${k}`) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
  return (
    <StaticPage title={t("faqTitle")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
        {items.map((i) => (
          <details key={i.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {i.q}
              <ChevronDown className="size-5 shrink-0 text-plum-700 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 leading-relaxed text-ink/80">{i.a}</p>
          </details>
        ))}
      </div>
      <Link href="/aide" className="inline-flex items-center gap-2 font-semibold text-plum-900 underline-offset-4 hover:underline">
        {t("faqMore")}
        <ArrowRight className="size-4 rtl:rotate-180" aria-hidden />
      </Link>
    </StaticPage>
  );
}
