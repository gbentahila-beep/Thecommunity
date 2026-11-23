import { ArrowRight, CalendarHeart, Coffee } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * « Travaillons ensemble » (accueil, centre d'aide) : les trois façons de travailler avec Wenzy, avec le même
 * vocabulaire partout — lieu partenaire (accueille nos groupes), organisateur (publie et vend ses activités), membre
 * de confiance (habitué invité à proposer des sorties). Même style que « Vous avez d'autres questions ? ».
 */
export async function AudienceCards({ headingLevel = "h3", withTitle = false }: { headingLevel?: "h2" | "h3"; withTitle?: boolean }) {
  const t = await getTranslations("audiences");
  const H = headingLevel;
  const cards = [
    { key: "partners", icon: Coffee, href: "/devenir-partenaire" },
    { key: "organizers", icon: CalendarHeart, href: "/devenir-organisateur" },
  ] as const;
  return (
    <section aria-labelledby={withTitle ? "work-title" : undefined} className="space-y-5" data-testid="audience-cards">
      {withTitle && (
        <div className="text-center">
          <h2 id="work-title" className="section-title">{t("sectionTitle")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-muted">{t("sectionText")}</p>
        </div>
      )}
      <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
        {cards.map(({ key, icon: Icon, href }) => (
          <div key={key} className="info-box flex flex-col items-center text-center">
            <span className="grid size-11 place-items-center rounded-full bg-white text-brand-900 shadow-card">
              <Icon className="size-5" aria-hidden />
            </span>
            <p className="eyebrow mt-5">{t(`${key}Eyebrow`)}</p>
            <H className="mt-1.5 card-title">{t(`${key}Title`)}</H>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink/80">{t(`${key}Text`)}</p>
            <Link href={href} className="btn btn-primary btn-sm mt-5">
              {t(`${key}Cta`)}
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Phrase de clôture de l'accueil, avec deux boutons. */
export async function ClosingCta({ signedIn = false }: { signedIn?: boolean }) {
  const t = await getTranslations("audiences");
  return (
    <section aria-labelledby="closing-title" className="py-16 text-center" data-testid="home-closing">
      <h2 id="closing-title" className="mx-auto max-w-2xl font-display text-[2.1rem] leading-[1.08] font-semibold tracking-[-0.02em] text-balance text-brand-900 sm:text-[3rem]">
        {t("closingTitle1")} <em className="text-brand-700 not-italic sm:italic">{t("closingTitle2")}</em>
      </h2>
      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
        <Link href={signedIn ? "/espace/reservations" : "/inscription"} className="btn btn-primary px-4">{signedIn ? t("closingBookings") : t("closingSignup")}</Link>
        <Link href="/experiences" className="btn btn-secondary px-4">{t("closingDiscover")}</Link>
      </div>
    </section>
  );
}
