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
    <section aria-labelledby="home-faq" className="grid gap-6 lg:grid-cols-[1fr_1.7fr] lg:gap-16">
      {/* Ordinateur : le titre à gauche, les questions à droite (comme les centres d'aide des sites de référence). */}
      <div>
        <h2 id="home-faq" className="section-title">
          {t("faqTitle")}
          <Bab name="memo" mood="surprised" className="ms-2 inline-block w-12 align-[-8px]" />
        </h2>
        <Link href="/aide" className="btn btn-secondary mt-6 hidden items-center gap-2 lg:inline-flex">
          <LifeBuoy className="size-4" aria-hidden />
          {t("allQuestions")}
        </Link>
      </div>
      <div>
      <div className="divide-y divide-line card">
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
      <div className="mt-6 flex lg:hidden">
        <Link href="/aide" className="btn btn-secondary inline-flex items-center gap-2">
          <LifeBuoy className="size-4" aria-hidden />
          {t("allQuestions")}
        </Link>
      </div>
      </div>
    </section>
  );
}
