import { ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { LEGAL_DOCS, type LegalKey } from "@/content/legal";
import { plainText, richText } from "@/lib/rich-text";

const docFor = (locale: string, key: LegalKey) => LEGAL_DOCS[locale === "en" || locale === "ar" ? locale : "fr"][key];

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
    const toc = (
      <ol className="space-y-0.5 text-sm">
        {doc.sections.map((s, i) => (
          <li key={i}>
            <a href={`#s${i + 1}`} className="block rounded-lg px-2 py-1.5 text-ink/80 transition hover:bg-cream hover:text-brand-900">{s.title}</a>
          </li>
        ))}
      </ol>
    );
    return (
      // Étape 7c (docs/29, piste A) : sommaire collant à gauche sur ordinateur, repliable sur téléphone.
      <StaticPage
        title={doc.title}
        intro={richText(doc.intro, missing)}
        aside={
          <>
            <details className="group rounded-[1.5rem] bg-white p-4 ring-1 ring-line lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {t("toc")}
                <span aria-hidden className="bub-lilac grid size-8 place-items-center rounded-full text-ink transition group-open:rotate-180"><ChevronDown className="size-4" /></span>
              </summary>
              <nav aria-label={t("toc")} className="mt-3">{toc}</nav>
            </details>
            <nav aria-label={t("toc")} className="hidden rounded-[1.5rem] bg-white p-4 shadow-card ring-1 ring-line/60 lg:block">
              <p className="eyebrow mb-2 px-2">{t("toc")}</p>
              {toc}
            </nav>
          </>
        }
      >
        <p className="inline-flex rounded-full bg-cream px-3 py-1 text-xs text-muted">{doc.updated}</p>
        {doc.sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="scroll-mt-28 space-y-3">
            <h2 className="font-display text-2xl font-semibold text-brand-900">{s.title}</h2>
            {s.body.map((b, j) =>
              typeof b === "string" ? (
                <p key={j} className="leading-relaxed text-ink/85">{richText(b, missing)}</p>
              ) : Array.isArray(b) ? (
                <ul key={j} className="list-disc space-y-1.5 ps-5 leading-relaxed text-ink/85">
                  {b.map((li, k) => <li key={k}>{richText(li, missing)}</li>)}
                </ul>
              ) : (
                <div key={j}>
                  {/* Ordinateur : vrai tableau. Mobile : une fiche par ligne. */}
                  <table className="hidden w-full overflow-hidden rounded-[var(--radius-card)] bg-white text-start text-sm shadow-card sm:table">
                    <thead className="bg-brand-50 text-brand-900">
                      <tr>{b.table.head.map((h) => <th key={h} scope="col" className="px-4 py-3 text-start font-semibold">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {b.table.rows.map((r, k) => (
                        <tr key={k} className="align-top">
                          {r.map((c, m) => m === 0 ? <th key={m} scope="row" className="px-4 py-3 text-start font-semibold text-ink">{richText(c, missing)}</th> : <td key={m} className="px-4 py-3 leading-relaxed text-ink/80">{richText(c, missing)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <ul className="space-y-3 sm:hidden">
                    {b.table.rows.map((r, k) => (
                      <li key={k} className="rounded-[var(--radius-card)] bg-white p-4 shadow-card">
                        <p className="font-semibold text-ink">{richText(r[0]!, missing)}</p>
                        <dl className="mt-2 space-y-1.5 text-sm">
                          {r.slice(1).map((c, m) => (
                            <div key={m}>
                              <dt className="text-xs font-semibold tracking-wide text-brand-700 uppercase">{b.table.head[m + 1]}</dt>
                              <dd className="leading-relaxed text-ink/80">{richText(c, missing)}</dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </section>
        ))}
      </StaticPage>
    );
  }
  return { generateMetadata, Page };
}
