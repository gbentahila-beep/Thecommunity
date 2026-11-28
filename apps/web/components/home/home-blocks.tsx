import { ArrowRight, HeartHandshake, Receipt, ShieldCheck, Users, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { BabLineup } from "@/components/brand/bab-lineup";
import { Link } from "@/i18n/navigation";

/**
 * Accueil, étape 3 (docs/29) : trois blocs réglables depuis le back-office (Accueil → sections).
 * - Manifeste : la promesse en trois phrases, puis la lignée des Babs (« Votre place »).
 * - Sécurité : la bande sombre de la page, trois repères et le lien vers les règles.
 * - Prix : ce qui se paie en ligne (35 DH) et ce qui se paie sur place (l'addition ou l'activité).
 */
export async function Manifesto() {
  const [t, tb] = await Promise.all([getTranslations("home"), getTranslations("babs")]);
  return (
    <section aria-label={`${t("manifesto1")} ${t("manifesto2")} ${t("manifesto3")}`} className="text-center" data-testid="home-manifesto">
      <p className="mx-auto max-w-4xl font-display text-[2.25rem] leading-[1.08] font-semibold tracking-[-0.025em] text-balance text-brand-900 sm:text-[3.5rem]">
        {t("manifesto1")} {t("manifesto2")} <span className="text-gradient">{t("manifesto3")}</span>
      </p>
      <div className="mt-14 sm:mt-16">
        <BabLineup seatLabel={tb("seat")} caption={tb("caption")} />
      </div>
    </section>
  );
}

export async function SafetyBand() {
  const t = await getTranslations("home");
  const points = [
    { icon: Users, label: t("trust1") },
    { icon: HeartHandshake, label: t("trust2") },
    { icon: ShieldCheck, label: t("trust3") },
  ];
  return (
    // Direction artistique (docs/29) : la bande sombre devient un grand panneau arrondi, posé sur le crème.
    <section aria-labelledby="safety-band-title" className="relative overflow-hidden rounded-[2.5rem] bg-ink px-5 py-12 text-center text-white sm:px-12 sm:py-20" data-testid="home-trust">
      <div className="section-head mx-auto max-w-2xl">
        <p className="eyebrow text-white/60">{t("safetyEyebrow")}</p>
        <h2 id="safety-band-title" className="section-title mt-3 text-white">{t("safetyTitle")}</h2>
      </div>
      <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3 sm:gap-6">
        {points.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-4 rounded-3xl bg-white/[0.06] px-6 py-8 ring-1 ring-white/10">
            <span className="grid size-12 place-items-center rounded-full bg-[linear-gradient(100deg,var(--color-coral),var(--color-violet))]">
              <Icon className="size-6 text-white" strokeWidth={1.8} aria-hidden />
            </span>
            <span className="text-[16px] leading-snug text-white/90">{label}</span>
          </li>
        ))}
      </ul>
      <Link href="/securite" className="group mt-10 inline-flex items-center gap-1.5 font-semibold text-white underline-offset-4 hover:underline">
        {t("safetyLink")}
        <ArrowRight className="size-4 transition group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden />
      </Link>
    </section>
  );
}

export async function PriceBlock() {
  const t = await getTranslations("home");
  const cols = [
    { title: t("priceOnlineTitle"), amount: t("priceOnlineAmount"), text: t("priceOnlineText"), accent: true, icon: Wallet, tone: "peach" },
    { title: t("priceOnSiteTitle"), amount: t("priceOnSiteAmount"), text: t("priceOnSiteText"), accent: false, icon: Receipt, tone: "lilac" },
  ];
  return (
    <section aria-labelledby="price-title" className="text-center" data-testid="home-price">
      <div className="section-head mx-auto max-w-2xl">
        <p className="eyebrow">{t("priceEyebrow")}</p>
        <h2 id="price-title" className="section-title mt-3">{t("priceTitle")}</h2>
      </div>
      <ul className="mx-auto grid max-w-4xl gap-4 text-start sm:grid-cols-2 sm:gap-6">
        {cols.map((c) => (
          <li key={c.title} className="card flex flex-col rounded-[1.75rem] p-6 sm:p-8">
            <span className={`bub-${c.tone} mb-5 grid size-13 place-items-center rounded-full`}><c.icon className="size-6 text-ink" strokeWidth={1.6} aria-hidden /></span>
            <p className="eyebrow">{c.title}</p>
            <p className={`mt-3 font-display text-[2.25rem] leading-none font-semibold tracking-[-0.02em] ${c.accent ? "text-gradient" : "text-brand-900"}`}>{c.amount}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/80">{c.text}</p>
          </li>
        ))}
      </ul>
      <Link href="/abonnement" className="btn btn-secondary mt-10">
        {t("priceLink")}
        <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
      </Link>
    </section>
  );
}
