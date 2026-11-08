import { ChevronDown, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { PrimaryLink } from "@/components/ui";

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** FAQ de l'accueil (les mêmes 10 questions que la page FAQ), puis renvoi vers le centre d'aide. */
export async function HomeFaq() {
  const [t, tf] = await Promise.all([getTranslations("home"), getTranslations("faq")]);
  return (
    <section aria-labelledby="home-faq" className="mx-auto max-w-3xl py-16">
      <h2 id="home-faq" className="text-center font-display text-[1.75rem] leading-tight font-medium text-plum-900 sm:text-[2.25rem]">{t("faqTitle")}</h2>
      <div className="mt-8 divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
        {KEYS.map((k) => (
          <details key={k} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {tf(`q${k}`)}
              <ChevronDown className="size-5 shrink-0 text-plum-700 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 leading-relaxed text-ink/80">{tf(`a${k}`)}</p>
          </details>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center gap-3 rounded-[var(--radius-card)] bg-cream-deep p-6 text-center sm:p-8">
        <LifeBuoy className="size-7 text-plum-900" aria-hidden />
        <h3 className="font-display text-2xl font-medium text-plum-900">{t("moreQuestions")}</h3>
        <p className="text-ink/75">{t("moreQuestionsText")}</p>
        <PrimaryLink href="/aide" className="mt-2">{t("helpCta")}</PrimaryLink>
      </div>
    </section>
  );
}
