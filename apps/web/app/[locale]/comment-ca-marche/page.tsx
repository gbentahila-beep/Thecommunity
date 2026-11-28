import { ArrowRight, Flag, MapPinCheck, ScrollText, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingTimeline } from "@/components/home/booking-timeline";
import { Universes } from "@/components/home/universes";
import { ClosingCta } from "@/components/audience-cards";
import { PageHero } from "@/components/page-hero";
import { Section } from "@/components/ui";
import { Link } from "@/i18n/navigation";
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
      {/* Étape 7c (docs/29, piste A) : en-tête photo comme l'accueil, la frise reliée par un fil, les formats,
          la sécurité en panneau sombre arrondi (comme sur l'accueil), puis le bandeau de clôture. */}
      <PageHero title={t("howTitle")} intro={t("howIntro")} photo="/images/photos/comment-groupe-3.webp" photoAlt="" position="50% 35%" />
      <Section>
        <BookingTimeline />
      </Section>
      <Section tone="white">
        <Universes categories={categories} title={t("formatsTitle")} />
      </Section>
      <Section>
        <section aria-labelledby="safety" data-testid="safety" className="relative overflow-hidden rounded-[2.5rem] bg-[linear-gradient(150deg,#f3e8fd_0%,#fbeaf2_55%,#ffeee6_100%)] px-5 py-12 sm:px-12 sm:py-20">
          <h2 id="safety" className="section-title section-head text-center">{t("safetyTitle")}</h2>
          <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
            {[
              { icon: MapPinCheck, k: "safety1" },
              { icon: ScrollText, k: "safety2" },
              { icon: UserRound, k: "safety3" },
              { icon: Flag, k: "safety4" },
            ].map(({ icon: Icon, k }) => (
              <li key={k} className="flex gap-4 rounded-[1.75rem] bg-white p-5 shadow-card sm:p-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-brand">
                  <Icon className="size-5 text-white" strokeWidth={1.8} aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{t(`${k}Title`)}</span>
                  <span className="mt-1 block text-[15px] leading-relaxed text-ink/70">{t(k)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">
            <Link href="/experiences" className="btn btn-primary">
              {th("heroCta")}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        </section>
      </Section>
      <Section tone="white" className="!pt-10 sm:!pt-16">
        <ClosingCta />
      </Section>
    </>
  );
}
