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
          <div key={key} className="flex flex-col items-center rounded-[1.75rem] bg-white px-6 py-8 text-center shadow-card sm:px-8">
            <span className={`${key === "partners" ? "bub-peach" : "bub-lilac"} grid size-13 place-items-center rounded-full text-ink`}>
              <Icon className="size-6" strokeWidth={1.6} aria-hidden />
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
    // Étape 7c (docs/29) : la photo de groupe est détourée (ciel retiré) et posée sur le bandeau pêche-lilas ;
    // la mosquée et les têtes dépassent du bord haut sur téléphone, le groupe s'appuie au coin bas droit sur ordinateur.
    <section aria-labelledby="closing-title" className="relative pt-16 lg:pt-6" data-testid="home-closing">
      <div className="relative flow-root rounded-[1.75rem] bg-[linear-gradient(105deg,#fff4ee_0%,#fbeef6_45%,#efe5ff_100%)] lg:min-h-[340px] lg:rounded-[2.5rem]">
        {/* Téléphone : la photo, recadrée sur le groupe et la mosquée, dépasse du bord haut et se fond dans le bandeau. */}
        <div className="pointer-events-none relative -mt-14 h-52 [mask-image:linear-gradient(0deg,transparent_0,#000_30%)] lg:hidden">
          <Image src="/images/photos/groupe-hassan-ii-detoure.webp" alt="" fill sizes="100vw" className="object-cover object-[78%_100%]" />
        </div>
        <div className="pointer-events-none absolute end-0 bottom-0 hidden w-[66%] lg:block">
          <Image
            src="/images/photos/groupe-hassan-ii-detoure.webp"
            alt=""
            width={1467}
            height={533}
            sizes="50rem"
            className="h-auto w-full rounded-ee-[2.5rem] [mask-image:linear-gradient(90deg,transparent_0,#000_24%)] rtl:[mask-image:linear-gradient(270deg,transparent_0,#000_24%)]"
          />
        </div>
        <div className="relative z-10 px-6 pt-1 pb-8 sm:px-10 lg:max-w-[48%] lg:p-14">
          <Sparks className="absolute end-6 -top-2 w-11 rotate-12 lg:start-5 lg:end-auto lg:-top-9 lg:-rotate-12" />
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
