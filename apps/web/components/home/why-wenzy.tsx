import { CalendarDays, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * « Pourquoi on fait ça » (accueil, sous les univers, et page À propos) : le constat en grand, la réponse en gras,
 * les trois choses dont on s'occupe, puis ce qu'il reste à faire au membre, dans un encadré.
 */
export async function WhyWenzy({ className = "py-16" }: { className?: string }) {
  const t = await getTranslations("home.why");
  const rows = [
    { icon: Users, k: "r1" },
    { icon: MapPin, k: "r2" },
    { icon: CalendarDays, k: "r3" },
  ] as const;
  return (
    <section aria-labelledby="why-title" className={className} data-testid="why-wenzy">
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-brand-900">{t("eyebrow")}</span>
        <h2 id="why-title" className="mt-5 font-display text-2xl leading-snug text-ink/45 sm:text-[2rem] sm:leading-tight">
          {t("lead")} <span className="text-ink">{t("punch")}</span>
        </h2>
        <ul className="mt-10 space-y-3">
          {rows.map(({ icon: Icon, k }) => (
            <li key={k} className="flex items-center gap-4 rounded-3xl bg-gradient-to-r from-brand-50 via-brand-50/60 to-transparent p-4 sm:gap-5 sm:p-5 rtl:bg-gradient-to-l">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-700 text-white shadow-card sm:size-14">
                <Icon className="size-5 sm:size-6" aria-hidden />
              </span>
              <span>
                <span className="block text-lg font-semibold text-ink">{t(`${k}Title`)}</span>
                <span className="mt-0.5 block text-[15px] leading-relaxed text-muted">{t(k)}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 rounded-3xl border-2 border-brand-200 bg-white px-6 py-6 text-center text-xl font-semibold leading-snug text-ink shadow-card sm:text-2xl">
          {t("closing")} <span className="font-display italic text-brand-700">{t("closingAccent")}</span>
        </p>
      </div>
    </section>
  );
}
