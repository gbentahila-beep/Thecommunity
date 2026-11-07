import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Questionnaire } from "@/components/onboarding/questionnaire";
import { PageShell } from "@/components/ui";
import { getCities } from "@/lib/data";
import { getMemberSpace } from "@/lib/data/member";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

export default async function OnboardingPage({ params, searchParams }: PageProps<"/[locale]/bienvenue">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const editing = (await searchParams).edition === "1";
  const [t, locale, cities] = await Promise.all([getTranslations("onboarding"), getLocale(), getCities()]);
  // Mode édition : on part du profil existant (membre de démo en phase 2).
  const initial = editing
    ? (({ firstName, lastName, phone, birthDate, cityId, gender, languages, interests, socialGoals, profession, bio }) => ({
        firstName, lastName, phone, birthDate, cityId, gender, languages, interests, socialGoals, profession, bio,
      }))((await getMemberSpace()).profile)
    : undefined;
  return (
    <PageShell className="py-10">
      <header className="mx-auto mb-8 max-w-xl">
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </header>
      <Questionnaire
        key={editing ? "edit" : "new"}
        editing={editing}
        initial={initial}
        cities={cities.map((c) => ({ id: c.id, name: tr(c.name, locale), isActive: c.isActive }))}
      />
    </PageShell>
  );
}
