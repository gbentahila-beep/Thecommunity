import { Flag, MapPinCheck, ScrollText, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingTimeline } from "@/components/home/booking-timeline";
import { HowItWorks } from "@/components/home/how-it-works";
import { Universes } from "@/components/home/universes";
import { PageHeader, PrimaryLink, Section } from "@/components/ui";
import { getCategories } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/[locale]/comment-ca-marche">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pages" });
  return { title: t("howTitle"), description: t("howIntro") };
}

/** Étape AB : les 3 cartes de l'accueil, la frise « après votre réservation », les formats, puis la sécurité en 4 points (fond clair). */
export default async function HowPage({ params }: PageProps<"/[locale]/comment-ca-marche">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, th, categories] = await Promise.all([getTranslations("pages"), getTranslations("home"), getCategories()]);
  return (
    <>
      {/* Même découpage que l'accueil (docs/29) : en-tête et étapes sur crème, puis fonds alternés. */}
      <PageHeader title={t("howTitle")} intro={t("howIntro")}>
        <div className="mt-12 lg:mt-16">
          <HowItWorks categories={categories} showTitle={false} />
        </div>
      </PageHeader>
      {/* Ce qui se passe après la réservation : la frise, de la réservation au lendemain. */}
      <Section tone="white">
        <BookingTimeline />
      </Section>
      <Section>
        <Universes categories={categories} title={t("formatsTitle")} />
      </Section>
      <Section tone="white">
        <section aria-labelledby="safety" data-testid="safety" className="max-w-4xl">
          <h2 id="safety" className="section-title section-head">{t("safetyTitle")}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: MapPinCheck, k: "safety1" },
              { icon: ScrollText, k: "safety2" },
              { icon: UserRound, k: "safety3" },
              { icon: Flag, k: "safety4" },
            ].map(({ icon: Icon, k }) => (
              <li key={k} className="flex gap-4 rounded-[var(--radius-card)] bg-cream p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-brand-900">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{t(`${k}Title`)}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-muted">{t(k)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="mt-12">
          <PrimaryLink href="/experiences">{th("heroCta")}</PrimaryLink>
        </div>
      </Section>
    </>
  );
}
