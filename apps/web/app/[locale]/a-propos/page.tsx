import { HeartHandshake, Shapes, Sprout, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StaticPage } from "@/components/static-page";
import { PrimaryLink } from "@/components/ui";
import { AYA_INSTAGRAM } from "@/lib/legal-info";

export async function generateMetadata({ params }: PageProps<"/[locale]/a-propos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("aboutTitle"), description: t("aboutText") };
}

export default async function AboutPage({ params }: PageProps<"/[locale]/a-propos">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, ta] = await Promise.all([getTranslations("pages"), getTranslations("home"), getTranslations("aboutPage")]);
  const values = [
    { icon: HeartHandshake, title: ta("value1Title"), text: ta("value1") },
    { icon: UsersRound, title: ta("value2Title"), text: ta("value2") },
    { icon: Shapes, title: ta("value3Title"), text: ta("value3") },
    { icon: Sprout, title: ta("value4Title"), text: ta("value4") },
  ];
  return (
    <StaticPage title={t("aboutTitle")} intro={t("aboutText")}>
      <section aria-labelledby="founder" className="rounded-[var(--radius-card)] bg-white p-6 shadow-card sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-plum-700">{ta("founderEyebrow")}</p>
        <div className="mt-4 flex items-center gap-4">
          {/* Monogramme en attendant une photo d'Aya dont nous avons les droits (docs/16). */}
          <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-full bg-plum-900 font-display text-2xl text-white">AS</span>
          <div>
            <h2 id="founder" className="font-display text-3xl font-medium text-plum-900">{ta("founderName")}</h2>
            <p className="text-sm text-muted">{ta("founderRole")}</p>
          </div>
        </div>
        <div className="mt-6 space-y-4 leading-relaxed text-ink/85">
          <p>{ta("founderP1")}</p>
          <p>{ta("founderP2")}</p>
          <p>{ta("founderP3")}</p>
        </div>
        <a
          href={AYA_INSTAGRAM.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-plum-900 px-5 py-2.5 text-sm font-semibold text-plum-900 transition hover:bg-plum-900 hover:text-white"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>
          {ta("followAya")} <span dir="ltr">(@{AYA_INSTAGRAM.handle})</span>
        </a>
      </section>
      <section aria-labelledby="values">
        <h2 id="values" className="font-display text-3xl font-medium text-plum-900">{ta("valuesTitle")}</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-[var(--radius-card)] bg-white p-5 shadow-card">
              <Icon className="size-6 text-plum-900" aria-hidden />
              <p className="mt-3 font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink/75">{text}</p>
            </li>
          ))}
        </ul>
      </section>
      <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
    </StaticPage>
  );
}
