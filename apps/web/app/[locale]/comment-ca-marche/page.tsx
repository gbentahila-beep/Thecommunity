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
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{t("howTitle")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/80">{t("howIntro")}</p>
      </header>
      <div className="mt-6">
        <HowItWorks categories={categories} showTitle={false} />
      </div>
      <Universes categories={categories} title={t("formatsTitle")} />
      <div className="mx-auto mt-6 max-w-4xl space-y-12">
        <section aria-labelledby="safety" className="rounded-[2rem] bg-plum-900 bg-[url(/images/brand/motif-fil-prune.svg)] bg-[length:460px_auto] p-6 text-cream sm:p-10">
          <h2 id="safety" className="font-display text-3xl font-medium">{t("safetyTitle")}</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-cream/85">{t("safetyText")}</p>
        </section>
        <div className="flex justify-center">
          <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
        </div>
      </div>
    </PageShell>
  );
}
