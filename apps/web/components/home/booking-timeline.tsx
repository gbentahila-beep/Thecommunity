import { Bell, CalendarCheck, Clock, Heart, MapPin, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * « Ce qui se passe après votre réservation » : la frise verticale du rendez-vous, de la réservation au lendemain.
 * Les heures sont celles de la timeline (packages/shared/src/tables.ts) : fermeture la veille 20h30, lieu dévoilé
 * la veille 21h30, check-in 30 min avant. Le point de chaque étape est rempli ; la dernière n'a pas de trait.
 */
export async function BookingTimeline({ id = "deroule" }: { id?: string }) {
  const t = await getTranslations("pages");
  const steps = [
    { icon: CalendarCheck, k: "tl1" },
    { icon: Clock, k: "tl2" },
    { icon: MapPin, k: "tl3" },
    { icon: Bell, k: "tl4" },
    { icon: Users, k: "tl5" },
    { icon: Heart, k: "tl6" },
  ] as const;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mx-auto max-w-4xl scroll-mt-24">
      <div className="section-head text-center">
        <h2 id={`${id}-title`} className="section-title">{t("stepsTitle")}</h2>
        <p className="lead mx-auto mt-3 max-w-xl">{t("stepsIntro")}</p>
      </div>
      {/* Étape 7c (docs/29, piste A) : un fil en dégradé relie les étapes ; le moment en serif, le détail dans une carte blanche. */}
      <ol data-testid="booking-steps">
        {steps.map(({ icon: Icon, k }, i) => (
          <li key={k} className="relative grid grid-cols-[2.75rem_1fr] gap-x-4 pb-6 last:pb-0 sm:grid-cols-[2.75rem_11rem_1fr] sm:gap-x-6 sm:pb-8">
            {i < steps.length - 1 && <span aria-hidden className="absolute start-[1.3rem] top-12 bottom-1 w-0.5 rounded-full bg-[linear-gradient(180deg,var(--color-coral),var(--color-violet))] opacity-30" />}
            <span aria-hidden className={`relative grid size-11 place-items-center rounded-full ${i === 0 ? "bg-gradient-brand text-white" : "bub-peach text-ink"}`}>
              <Icon className="size-5" strokeWidth={1.8} />
            </span>
            <p className="self-center font-display text-[1.35rem] leading-tight font-semibold text-brand-900 sm:self-start sm:pt-2 sm:text-2xl">{t(`${k}When`)}</p>
            <div className="col-start-2 mt-3 min-w-0 rounded-[1.5rem] bg-white p-5 shadow-card sm:col-start-3 sm:mt-0 sm:p-6">
              <h3 className="text-lg font-semibold text-ink">{t(`${k}Title`)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink/75">{t(`${k}Text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
