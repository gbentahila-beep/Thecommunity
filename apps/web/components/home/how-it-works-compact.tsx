import { ArrowRight, CalendarCheck, Search, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Proposition (étape V, à valider) : « Comment ça marche » en 3 étapes courtes, une icône et une phrase chacune,
 * dans une seule carte blanche ; un seul bouton. Tient sur un écran de téléphone.
 */
export async function HowItWorksCompact() {
  const t = await getTranslations("home");
  const steps = [
    { icon: Search, title: t("how1Title"), text: t("how1Text") },
    { icon: CalendarCheck, title: t("how2Title"), text: t("how2Text") },
    { icon: Users, title: t("how3Title"), text: t("how3Text") },
  ];
  return (
    <section aria-labelledby="how-title" className="py-12" data-testid="how-compact">
      <h2 id="how-title" className="section-title text-center">{t("howTitle")}</h2>
      <ol className="card mx-auto mt-8 grid max-w-5xl gap-6 p-6 sm:p-8 md:grid-cols-3">
        {steps.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="flex gap-4 md:flex-col md:gap-3">
            <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Icon className="size-5" aria-hidden />
              <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">{i + 1}</span>
            </span>
            <span>
              <span className="block font-semibold text-ink">{title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex justify-center">
        <Link href="/experiences" className="btn btn-primary inline-flex items-center gap-2">
          {t("heroCta")}
          <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
