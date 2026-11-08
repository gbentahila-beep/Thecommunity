import { AtSign, Download, Mail } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { setRequestLocale } from "next-intl/server";
import { CopyButton } from "@/components/booking/copy-button";
import { PageShell } from "@/components/ui";
import { PRESS } from "@/content/press";
import { Link } from "@/i18n/navigation";
import { AYA_INSTAGRAM } from "@/lib/legal-info";

type L = "fr" | "en" | "ar";
const lang = (l: string): L => (l === "en" || l === "ar" ? l : "fr");

export async function generateMetadata({ params }: PageProps<"/[locale]/presse">): Promise<Metadata> {
  const l = lang((await params).locale);
  return { title: PRESS.title[l], description: PRESS.intro[l] };
}

const h2 = "font-display text-3xl font-medium text-plum-900";
const card = "rounded-[var(--radius-card)] bg-white p-5 shadow-card";

/** Kit presse : présentation (3 longueurs), faits clés, fondatrice, logos, couleurs, typographies, photos, contact. */
export default async function PressPage({ params }: PageProps<"/[locale]/presse">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const l = lang(locale);
  const P = PRESS;
  return (
    <PageShell className="py-10 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{P.title[l]}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/80">{P.intro[l]}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="#logos" className="inline-flex items-center gap-2 rounded-full bg-plum-900 px-5 py-3 text-sm font-semibold text-white hover:bg-plum-800">
            <Download className="size-4" aria-hidden />
            {P.ctaLogos[l]}
          </a>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-plum-900 px-5 py-3 text-sm font-semibold text-plum-900 hover:bg-plum-50">
            <Mail className="size-4" aria-hidden />
            {P.ctaContact[l]}
          </Link>
        </div>
      </header>

      <div className="mx-auto mt-12 max-w-4xl space-y-14">
        <section aria-labelledby="bref">
          <h2 id="bref" className={h2}>{P.aboutTitle[l]}</h2>
          <p className="mt-1 text-sm text-muted">{P.aboutHint[l]}</p>
          <div className="mt-5 space-y-3">
            {P.boilerplates.map((b) => (
              <article key={b.label.fr} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{b.label[l]}</h3>
                  <CopyButton value={b.text[l]} label={P.copy[l]} copiedLabel={P.copied[l]} />
                </div>
                <p className="mt-2 leading-relaxed text-ink">{b.text[l]}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="faits" className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 id="faits" className={h2}>{P.factsTitle[l]}</h2>
            <dl className={`${card} mt-5 divide-y divide-line`}>
              {P.facts.map((f) => (
                <div key={f.k.fr} className="py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">{f.k[l]}</dt>
                  <dd className="mt-0.5 text-ink">{f.v[l]}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className={h2}>{P.founderTitle[l]}</h2>
            <div className={`${card} mt-5`}>
              <p className="leading-relaxed text-ink">{P.founderText[l]}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-plum-900">
                <Link href="/a-propos" className="underline underline-offset-4">{P.founderMore[l]}</Link>
                <a href={AYA_INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-4">
                  <AtSign className="size-4" aria-hidden />
                  {P.instagram[l]}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="logos" aria-labelledby="logos-title" className="scroll-mt-24">
          <h2 id="logos-title" className={h2}>{P.logosTitle[l]}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{P.logosRules[l]}</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {P.logos.map((g) => (
              <li key={g.file} className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
                <div className={`grid h-36 place-items-center p-6 ${g.dark ? "bg-plum-900" : "bg-cream"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- aperçu vectoriel du fichier téléchargeable */}
                  <img src={`/presse/${g.file}.svg`} alt={g.label[l]} className="max-h-24 w-auto max-w-full" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <p className="text-sm font-medium text-ink">{g.label[l]}</p>
                  <p className="flex gap-2 text-xs font-semibold">
                    <a href={`/presse/${g.file}.svg`} download className="rounded-full border border-line px-3 py-1.5 text-plum-900 hover:bg-plum-50">SVG</a>
                    <a href={`/presse/${g.file}.png`} download className="rounded-full border border-line px-3 py-1.5 text-plum-900 hover:bg-plum-50">PNG</a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="couleurs" className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div>
            <h2 id="couleurs" className={h2}>{P.colorsTitle[l]}</h2>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {P.colors.map((c) => (
                <li key={c.hex} className="overflow-hidden rounded-2xl bg-white shadow-card">
                  <div className={`h-20 ${c.light ? "border-b border-line" : ""}`} style={{ background: c.hex }} />
                  <div className="flex items-center justify-between gap-1 p-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{c.name[l]}</p>
                      <p className="font-mono text-xs text-muted" dir="ltr">{c.hex}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className={h2}>{P.typeTitle[l]}</h2>
            <p className={`${card} mt-5 text-sm leading-relaxed text-ink`}>{P.type[l]}</p>
          </div>
        </section>

        <section aria-labelledby="photos">
          <h2 id="photos" className={h2}>{P.photosTitle[l]}</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2">
            {P.photos.map((p) => (
              <li key={p.file} className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
                <div className="relative aspect-[4/3]">
                  <Image src={`/presse/${p.file}`} alt={p.alt[l]} fill sizes="(min-width: 640px) 45vw, 100vw" className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-2 p-4">
                  <p className="text-sm text-muted">{p.alt[l]}</p>
                  <a href={`/presse/${p.file}`} download className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-plum-900 hover:bg-plum-50">
                    <Download className="size-3.5" aria-hidden />
                    {P.download[l]}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">{P.photosNote[l]}</p>
        </section>

        <section aria-labelledby="contact-presse" className="rounded-[2rem] bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] p-6 text-cream sm:p-10">
          <h2 id="contact-presse" className="font-display text-3xl font-medium">{P.contactTitle[l]}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cream/85">{P.contactText[l]}</p>
          <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-plum-900 hover:bg-white">
            <Mail className="size-4" aria-hidden />
            {P.contactCta[l]}
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
