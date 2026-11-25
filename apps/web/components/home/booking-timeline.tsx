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
      {/* Étape 6 (docs/29) : le moment en grand, à gauche sur ordinateur ; le détail à droite, sans carte. */}
      <ol data-testid="booking-steps" className="border-t border-line">
        {steps.map(({ icon: Icon, k }, i) => (
          <li key={k} className="grid gap-2 border-b border-line py-6 sm:grid-cols-[13rem_1fr] sm:gap-8 sm:py-8">
            <p className="flex items-center gap-3 sm:items-start">
              <span aria-hidden className={`grid size-9 shrink-0 place-items-center rounded-full ${i === 0 ? "bg-brand-900 text-white" : "bg-white text-brand-900 ring-1 ring-line"}`}>
                <Icon className="size-[18px]" />
              </span>
              <span className="font-display text-[1.35rem] leading-tight font-semibold text-brand-900 sm:text-2xl">{t(`${k}When`)}</span>
            </p>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-ink">{t(`${k}Title`)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink/75">{t(`${k}Text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
