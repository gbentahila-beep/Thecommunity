import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { LEGAL_DOCS, type LegalKey } from "@/content/legal";
import { plainText, richText } from "@/lib/rich-text";

const docFor = (locale: string, key: LegalKey) => LEGAL_DOCS[locale === "en" ? "en" : "fr"][key];

/** Pages juridiques et Sécurité, rédigées à partir du fonctionnement réel du site. */
export function legalPage(key: LegalKey) {
  async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const doc = docFor(locale, key);
    return { title: doc.title, description: plainText(doc.intro) };
  }
  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale);
    const t = await getTranslations("legal");
    const doc = docFor(locale, key);
    const missing = t("missing");
    return (
      <StaticPage title={doc.title} intro={richText(doc.intro, missing)}>
        <p className="text-sm text-muted">{doc.updated}</p>
        {locale === "ar" && <p className="rounded-xl bg-plum-50 px-4 py-3 text-sm text-plum-900">{t("arabicPending")}</p>}
        <nav aria-label={t("toc")} className="rounded-[var(--radius-card)] bg-white/70 p-5">
          <ol className="space-y-1 text-sm">
            {doc.sections.map((s, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="text-plum-900 underline-offset-4 hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>
        {doc.sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-medium text-plum-900">{s.title}</h2>
            {s.body.map((b, j) =>
              Array.isArray(b) ? (
                <ul key={j} className="list-disc space-y-1.5 ps-5 leading-relaxed text-ink/85">
                  {b.map((li, k) => <li key={k}>{richText(li, missing)}</li>)}
                </ul>
              ) : (
                <p key={j} className="leading-relaxed text-ink/85">{richText(b, missing)}</p>
              ),
            )}
          </section>
        ))}
      </StaticPage>
    );
  }
  return { generateMetadata, Page };
}
