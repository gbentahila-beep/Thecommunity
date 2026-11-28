import { ArrowRight, CalendarHeart, Coffee } from "lucide-react";
import Image from "next/image";
import { Sparks } from "@/components/brand/doodles";
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

/**
 * Phrase de clôture de l'accueil, avec deux boutons. Direction artistique (docs/29) : grand bandeau arrondi pêche-lilas,
 * la photo de groupe (mosquée Hassan II) dépasse en haut à droite ; sur téléphone, elle coiffe le bandeau.
 */
export async function ClosingCta({ signedIn = false }: { signedIn?: boolean }) {
  const t = await getTranslations("audiences");
  return (
    <section aria-labelledby="closing-title" className="relative pt-36 lg:pt-16" data-testid="home-closing">
      <div className="relative rounded-[1.75rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] lg:grid lg:min-h-[340px] lg:grid-cols-[1fr_1.15fr] lg:items-center lg:rounded-[2.5rem]">
        <div className="absolute start-0 end-0 -top-36 h-56 [clip-path:url(#shape-band-m)] lg:start-auto lg:-top-16 lg:bottom-0 lg:h-auto lg:w-[58%] lg:[clip-path:url(#shape-band)]">
          <Image src="/images/photos/groupe-hassan-ii.webp" alt="" fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover object-[60%_40%] [mask-image:linear-gradient(0deg,transparent_0,#000_35%)] lg:[mask-image:linear-gradient(90deg,transparent_0,#000_18%)] rtl:lg:[mask-image:linear-gradient(270deg,transparent_0,#000_18%)]" />
        </div>
        <div className="relative z-10 px-6 pt-24 pb-8 sm:px-10 lg:p-14">
          <Sparks className="absolute start-6 top-14 w-12 -rotate-12 lg:start-5 lg:-top-9" />
          <h2 id="closing-title" className="font-display text-[2rem] leading-[1.06] font-semibold tracking-[-0.025em] text-balance text-brand-900 sm:text-5xl">
            {t("closingTitle1")} <em className="text-brand-700">{t("closingTitle2")}</em>
          </h2>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={signedIn ? "/espace/reservations" : "/inscription"} className="btn btn-primary">{signedIn ? t("closingBookings") : t("closingSignup")}</Link>
            <Link href="/experiences" className="btn btn-secondary">{t("closingDiscover")}</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
