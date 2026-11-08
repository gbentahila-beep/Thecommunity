import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { HowItWorks } from "@/components/home/how-it-works";
import { PageShell, PrimaryLink } from "@/components/ui";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/comment-ca-marche">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("howTitle"), description: t("howIntro") };
}

/** Même présentation que la section de l'accueil (cartes décalées), puis les formats et la sécurité (étape 12). */
export default async function HowPage({ params }: PageProps<"/[locale]/comment-ca-marche">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, categories, loc] = await Promise.all([getTranslations("pages"), getTranslations("home"), getCategories(), getLocale()]);
  return (
    <PageShell className="py-10 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-medium text-plum-900 sm:text-5xl">{t("howTitle")}</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/80">{t("howIntro")}</p>
      </header>
      <div className="mt-6">
        <HowItWorks categories={categories} showTitle={false} />
      </div>
      <div className="mx-auto max-w-4xl space-y-12">
        <section aria-labelledby="formats">
          <h2 id="formats" className="font-display text-3xl font-medium text-plum-900">{t("formatsTitle")}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {categories.map((c) => (
              <li key={c.id} className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 p-4">
                <CategoryIcon category={c.id} className="mt-0.5 size-5 text-plum-700" />
                <div>
                  <p className="font-semibold text-ink">{tr(c.name, loc)}</p>
                  <p className="text-sm text-muted">{tr(c.description, loc)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
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
