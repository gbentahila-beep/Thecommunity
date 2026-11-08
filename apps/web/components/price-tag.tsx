import { formatMoney, memberUnitPrice, priceSplit, type Experience, type ExperiencePricing, type MembershipPlan, type Money } from "@thecommunity/shared";

/** Prix membre d'une place pour cette expérience, si une formule d'abonnement est proposée (sinon null). */
export function memberAmountFor(plan: MembershipPlan | null, publicPrice: Money, experience: Pick<Experience, "memberPrice">): number | null {
  if (!plan) return null;
  const m = memberUnitPrice(publicPrice.amount, plan, experience.memberPrice?.amount ?? null);
  return m < publicPrice.amount ? m : null;
}

/** Traductions de l'espace « twoPart » (passées par la page, qui a déjà son traducteur). */
export type TwoPartT = (key: "now" | "onSite" | "plusConsumption" | "consumptionOnSite", values?: { amount: string }) => string;

/**
 * Prix affiché : le prix public BARRÉ à côté du prix membre (argument de vente de l'abonnement),
 * ou le prix public seul s'il n'y a pas de prix membre.
 * Tarification en deux parts (étape 11) :
 * - prix fixe chez le partenaire → total par personne, puis « 250 DH maintenant · 200 DH sur place » ;
 * - consommation libre → « 150 DH + consommation » (jamais de faux total).
 * Le prix membre ne réduit que la part payée en ligne.
 */
export function PriceTag({
  price,
  memberAmount,
  lang,
  memberLabel,
  size = "md",
  pricing,
  t2,
  detail = true,
}: {
  price: Money;
  memberAmount: number | null;
  lang: "fr" | "ar" | "en";
  memberLabel: string;
  size?: "md" | "lg";
  pricing?: ExperiencePricing | null;
  t2?: TwoPartT;
  /** false : sans la ligne « … maintenant · … sur place » (barre compacte). */
  detail?: boolean;
}) {
  const split = pricing && t2 ? priceSplit(price.amount, pricing) : null;
  const twoPart = split !== null && split.model !== "online_only";
  const onSite = twoPart && split.onSiteUnit != null ? split.onSiteUnit : 0;
  const fmt = (amount: number) => formatMoney({ amount, currency: price.currency }, lang);
  const big = size === "lg" ? "text-3xl" : "text-lg";
  const shown = price.amount + onSite;
  const main =
    memberAmount === null ? (
      <span className={`${big} font-bold text-ink`}>{fmt(shown)}</span>
    ) : (
      <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <s className={`${size === "lg" ? "text-lg" : "text-sm"} text-muted decoration-plum-700/60`} aria-label={fmt(shown)}>
          {fmt(shown)}
        </s>
        <span className={`${big} font-bold text-plum-900`}>{fmt(memberAmount + onSite)}</span>
        <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plum-900">{memberLabel}</span>
      </span>
    );
  if (!twoPart || !t2) return main;
  const now = memberAmount ?? price.amount;
  return (
    <span className="inline-flex flex-col gap-0.5" data-two-part={split.model}>
      <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
        {main}
        {split.variable && <span className={`${size === "lg" ? "text-lg" : "text-sm"} font-semibold text-ink`}>{t2("plusConsumption")}</span>}
      </span>
      {detail && <span className="text-xs font-normal text-muted">
        {t2("now", { amount: fmt(now) })} · {split.onSiteUnit != null ? t2("onSite", { amount: fmt(split.onSiteUnit) }) : t2("consumptionOnSite")}
      </span>}
    </span>
  );
}
