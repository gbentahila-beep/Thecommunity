import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Questionnaire } from "@/components/onboarding/questionnaire";
import { PageShell } from "@/components/ui";
import { getCities } from "@/lib/data";
import { fsMemberData } from "@/lib/data/firestore-source";
import { getMemberSpace, requireMember } from "@/lib/data/member";
import { adminAuth } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

export default async function OnboardingPage({ params, searchParams }: PageProps<"/[locale]/bienvenue">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const editing = (await searchParams).edition === "1";
  const [t, locale, cities] = await Promise.all([getTranslations("onboarding"), getLocale(), getCities()]);
  const pick = ({ firstName, lastName, phone, birthDate, cityId, gender, languages, interests, socialGoals, profession, bio }: Awaited<ReturnType<typeof getMemberSpace>>["profile"]) => ({
    firstName, lastName, phone: phone ?? "", birthDate, cityId, gender: gender ?? undefined, languages, interests, socialGoals, profession: profession ?? "", bio: bio ?? "",
  });
  let uid: string | undefined;
  let initial: ReturnType<typeof pick> | undefined;
  if (FIREBASE_ENABLED) {
    // Compte connecté obligatoire ; on pré-remplit avec ce qui est déjà connu (prénom saisi à l'inscription).
    const user = await requireMember({ allowIncompleteProfile: true, next: "/bienvenue" });
    uid = user.uid;
    const { profile } = await fsMemberData(user.uid);
    const displayName = (await adminAuth().getUser(user.uid)).displayName ?? "";
    initial = { ...pick(profile), firstName: profile.firstName || displayName };
  } else if (editing) {
    // Mode démonstration : profil du membre fictif.
    initial = pick((await getMemberSpace()).profile);
  }
  return (
    <PageShell className="py-10">
      <header className="mx-auto mb-8 max-w-xl">
        <h1 className="font-display text-4xl font-medium text-plum-900">{t("title")}</h1>
        <p className="mt-2 text-muted">{t("subtitle")}</p>
      </header>
      <Questionnaire
        key={editing ? "edit" : "new"}
        editing={editing}
        uid={uid}
        initial={initial}
        cities={cities.map((c) => ({ id: c.id, name: tr(c.name, locale), isActive: c.isActive }))}
      />
    </PageShell>
  );
}
