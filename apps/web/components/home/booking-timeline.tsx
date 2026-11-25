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
    <section id={id} aria-labelledby={`${id}-title`} className="max-w-3xl scroll-mt-24">
      <h2 id={`${id}-title`} className="section-title">{t("stepsTitle")}</h2>
      <p className="mt-3 text-[15px] text-muted">{t("stepsIntro")}</p>
      <ol className="mt-8" data-testid="booking-steps">
        {steps.map(({ icon: Icon, k }, i) => (
          <li key={k} className="relative flex gap-4 pb-8 last:pb-0 sm:gap-6">
            {i < steps.length - 1 && <span aria-hidden className="absolute start-6 top-12 bottom-0 w-0.5 -translate-x-1/2 bg-brand-200 rtl:translate-x-1/2" />}
            <span className={`relative grid size-12 shrink-0 place-items-center rounded-full shadow-card ${i === 0 ? "bg-brand-700 text-white" : "bg-white text-brand-700 ring-2 ring-brand-200"}`}>
              <Icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 rounded-3xl bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t(`${k}When`)}</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">{t(`${k}Title`)}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{t(`${k}Text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
