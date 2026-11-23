import { ChevronDown, LifeBuoy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Bab } from "@/components/brand/bab";

/** Étape V : les 5 questions les plus utiles ; les autres sont dans la FAQ et le centre d'aide. */
const KEYS = [1, 2, 3, 6, 4] as const;

/** FAQ de l'accueil (les mêmes 10 questions que la page FAQ), puis renvoi vers le centre d'aide. */
export async function HomeFaq() {
  const [t, tf] = await Promise.all([getTranslations("home"), getTranslations("faq")]);
  return (
    <section aria-labelledby="home-faq" className="mx-auto max-w-3xl pt-16 pb-5">
      <h2 id="home-faq" className="section-title text-center">
        {t("faqTitle")}
        <Bab name="memo" mood="surprised" className="ms-2 inline-block w-12 align-[-8px]" />
      </h2>
      <div className="mt-8 divide-y divide-line card">
        {KEYS.map((k) => (
          <details key={k} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              {tf(`q${k}`)}
              <ChevronDown className="size-5 shrink-0 text-brand-700 transition group-open:rotate-180" aria-hidden />
            </summary>
            <p className="mt-3 leading-relaxed text-ink/80">{tf(`a${k}`)}</p>
          </details>
        ))}
      </div>
      <div className="mt-6 flex justify-center">
        <Link href="/aide" className="btn btn-secondary inline-flex items-center gap-2">
          <LifeBuoy className="size-4" aria-hidden />
          {t("allQuestions")}
        </Link>
      </div>
    </section>
  );
}
