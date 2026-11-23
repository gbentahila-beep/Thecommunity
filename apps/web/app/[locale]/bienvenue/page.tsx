import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Questionnaire } from "@/components/onboarding/questionnaire";
import { PageShell } from "@/components/ui";
import { getCategories, getCities } from "@/lib/data";
import { fsMemberData } from "@/lib/data/firestore-source";
import { getMemberSpace, requireMember } from "@/lib/data/member";
import { adminAuth } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";
import { tr } from "@/lib/i18n-text";

export const metadata: Metadata = { robots: { index: false } };

export default async function OnboardingPage({ params, searchParams }: PageProps<"/[locale]/bienvenue">) {
  const { locale: localeParam } = await params;
  setRequestLocale(localeParam);
  const sp = await searchParams;
  const editing = sp.edition === "1";
  const startAt = typeof sp.etape === "string" ? sp.etape : undefined;
  // Audit 23/11 : retour à l'événement choisi avant l'inscription (chemin interne seulement).
  const next = typeof sp.suite === "string" && sp.suite.startsWith("/") && !sp.suite.startsWith("//") && !sp.suite.includes("\\") ? sp.suite : undefined;
  const [t, locale, cities, categories] = await Promise.all([getTranslations("onboarding"), getLocale(), getCities(), getCategories()]);
  const pick = (p: Awaited<ReturnType<typeof getMemberSpace>>["profile"]) => ({
    firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? "", birthDate: p.birthDate, cityId: p.cityId, gender: p.gender ?? undefined,
    languages: p.languages, interests: p.interests, socialGoals: p.socialGoals, profession: p.profession ?? "", bio: p.bio ?? "",
    district: p.district ?? "", favoriteCategories: p.favoriteCategories ?? [], sportLevel: p.sportLevel ?? undefined, agePreference: p.agePreference ?? "any",
    groupVibe: p.groupVibe ?? undefined, conversationStyle: p.conversationStyle ?? undefined, humor: p.humor ?? undefined, lifeValues: (p.lifeValues ?? []) as never,
    exerciseFrequency: p.exerciseFrequency ?? undefined, venueBudget: p.venueBudget ?? undefined, diets: (p.diets ?? []) as never, sector: (p.sector ?? undefined) as never,
    referral: (p.referral ?? undefined) as never, whatsapp: Boolean(p.whatsapp), instagram: p.instagram ?? "",
  });
  let uid: string | undefined;
  let initial: ReturnType<typeof pick> | undefined;
  if (FIREBASE_ENABLED) {
    // Compte connecté obligatoire ; on pré-remplit avec ce qui est déjà connu (prénom saisi à l'inscription).
    const user = await requireMember({ allowIncompleteProfile: true, next: "/bienvenue" });
    uid = user.uid;
    const { profile } = await fsMemberData(user.uid);
    const displayName = (await adminAuth().getUser(user.uid)).displayName ?? "";
    // Compte Google : « Prénom Nom » → prénom et nom pré-remplis séparément.
    const [first = "", ...rest] = displayName.trim().split(/\s+/);
    initial = { ...pick(profile), firstName: profile.firstName || first, lastName: profile.lastName || rest.join(" ") };
  } else if (editing) {
    // Mode démonstration : profil du membre fictif.
    initial = pick((await getMemberSpace()).profile);
  }
  return (
    <PageShell className="py-6 sm:py-10">
      <h1 className="sr-only">{t("title")}</h1>
      <Questionnaire
        key={editing ? `edit-${startAt ?? ""}` : "new"}
        editing={editing}
        startAt={startAt}
        continueTo={next}
        uid={uid}
        initial={initial}
        cities={cities.map((c) => ({ id: c.id, name: tr(c.name, locale), isActive: c.isActive }))}
        categories={categories.map((c) => ({ id: c.id, name: tr(c.shortName, locale) }))}
      />
    </PageShell>
  );
}
