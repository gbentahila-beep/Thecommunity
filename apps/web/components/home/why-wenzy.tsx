import { CalendarDays, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Bab } from "@/components/brand/bab";

/**
 * « Pourquoi on fait ça » (accueil, sous les univers, et page À propos), au style des autres sections : surtitre et
 * titre centrés, le constat en texte d'accompagnement, trois cartes blanches (ce dont on s'occupe), puis la phrase de
 * fin en grand, la seconde moitié au dégradé de la marque, avec la mascotte.
 */
export async function WhyWenzy({ className = "py-12" }: { className?: string }) {
  const t = await getTranslations("home.why");
  const rows = [
    { icon: Users, k: "r1" },
    { icon: MapPin, k: "r2" },
    { icon: CalendarDays, k: "r3" },
  ] as const;
  return (
    <section aria-labelledby="why-title" className={className} data-testid="why-wenzy">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h2 id="why-title" className="section-title mt-2">{t("title")}</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink/75">
          {t("text")} <strong className="font-semibold text-ink">{t("punch")}</strong>
        </p>
      </div>
      <ul className="mx-auto mt-8 grid max-w-4xl gap-3 sm:gap-4 md:grid-cols-3">
        {rows.map(({ icon: Icon, k }) => (
          <li key={k} className="card flex items-start gap-4 p-5 md:flex-col md:items-center md:p-6 md:text-center">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-900">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-lg font-semibold text-ink">{t(`${k}Title`)}</span>
              <span className="mt-1 block text-[15px] leading-relaxed text-muted">{t(k)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-2 text-center font-display text-2xl font-semibold tracking-[-0.01em] text-brand-900 sm:text-[1.9rem]">
        <span>{t("closing")}</span>
        <span className="bg-[linear-gradient(100deg,var(--color-coral),var(--color-violet))] bg-clip-text text-transparent">{t("closingAccent")}</span>
        <Bab name="wen" mood="party" className="inline-block w-11" />
      </p>
    </section>
  );
}
