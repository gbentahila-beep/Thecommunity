import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryIcon } from "@/components/category-icon";
import { StaticPage } from "@/components/static-page";
import { PrimaryLink } from "@/components/ui";
import { getCategories } from "@/lib/data";
import { tr } from "@/lib/i18n-text";

export async function generateMetadata({ params }: PageProps<"/[locale]/comment-ca-marche">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("howTitle"), description: t("howIntro") };
}

export default async function HowPage({ params }: PageProps<"/[locale]/comment-ca-marche">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, categories, loc] = await Promise.all([getTranslations("pages"), getTranslations("home"), getCategories(), getLocale()]);
  const steps = [
    [th("how1Title"), th("how1Text")],
    [th("how2Title"), th("how2Text")],
    [th("how3Title"), th("how3Text")],
  ];
  return (
    <StaticPage title={t("howTitle")} intro={t("howIntro")}>
      <ol className="space-y-4">
        {steps.map(([title, text], i) => (
          <li key={title} className="flex gap-5 rounded-[var(--radius-card)] bg-white p-5 shadow-card">
            <span className="font-display text-4xl leading-none text-plum-200">{i + 1}</span>
            <div>
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-1 text-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <section>
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("formatsTitle")}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
      <section>
        <h2 className="font-display text-2xl font-medium text-plum-900">{t("safetyTitle")}</h2>
        <p className="mt-3 leading-relaxed text-ink/80">{t("safetyText")}</p>
      </section>
      <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
    </StaticPage>
  );
}
