import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HowItWorks } from "@/components/home/how-it-works";
import { Universes } from "@/components/home/universes";
import { PageShell, PrimaryLink } from "@/components/ui";
import { getCategories } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[locale]/comment-ca-marche">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("howTitle"), description: t("howIntro") };
}

/** Même présentation que l'accueil : cartes décalées (12), puis les formats comme « Cinq univers » (12b), puis la sécurité. */
export default async function HowPage({ params }: PageProps<"/[locale]/comment-ca-marche">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, categories] = await Promise.all([getTranslations("pages"), getTranslations("home"), getCategories()]);
  return (
    <PageShell className="py-10 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="page-title">{t("howTitle")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/80">{t("howIntro")}</p>
      </header>
      <div className="mt-6">
        <HowItWorks categories={categories} showTitle={false} />
      </div>
      {/* Étape 28 : le parcours de réservation en 5 étapes. */}
      <section aria-labelledby="steps-title" className="mx-auto max-w-4xl pb-14">
        <h2 id="steps-title" className="section-title text-center">{t("stepsTitle")}</h2>
        <ol className="mt-8 space-y-4" data-testid="booking-steps">
          {[1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="flex gap-4 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-plum-900 font-display text-lg text-white" aria-hidden>{i}</span>
              <span>
                <span className="block text-lg font-semibold text-ink">{t(`step${i}Title`)}</span>
                <span className="mt-1 block text-[15px] text-muted">{t(`step${i}Text`)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <Universes categories={categories} title={t("formatsTitle")} />
      <div className="mx-auto mt-6 max-w-4xl space-y-12">
        <section aria-labelledby="safety" className="rounded-3xl bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] p-6 text-cream sm:p-10">
          <h2 id="safety" className="section-title">{t("safetyTitle")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cream/85">{t("safetyText")}</p>
        </section>
        <div className="flex justify-center">
          <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
        </div>
      </div>
    </PageShell>
  );
}
