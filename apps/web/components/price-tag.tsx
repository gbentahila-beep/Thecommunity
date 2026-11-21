import { formatMoney, memberUnitPrice, priceSplit, type Experience, type ExperiencePricing, type MembershipPlan, type Money, type RestaurantBudget } from "@thecommunity/shared";

/** « 200–300 DH » (fourchette) ou « 299 DH » (montant exact). */
export function budgetText(b: RestaurantBudget, lang: "fr" | "ar" | "en"): string {
  if (b.kind === "fixed") return formatMoney({ amount: b.amount, currency: b.currency }, lang);
  return `${Math.round(b.min / 100)}–${formatMoney({ amount: b.max, currency: b.currency }, lang)}`;
}

/** Prix membre d'une place pour cette expérience, si une formule d'abonnement est proposée (sinon null). */
export function memberAmountFor(plan: MembershipPlan | null, publicPrice: Money, experience: Pick<Experience, "memberPrice">): number | null {
  if (!plan) return null;
  const m = memberUnitPrice(publicPrice.amount, plan, experience.memberPrice?.amount ?? null);
  return m < publicPrice.amount ? m : null;
}

/** Traductions de l'espace « twoPart » (passées par la page, qui a déjà son traducteur). */
export type TwoPartT = (key: "now" | "onSite" | "plusConsumption" | "consumptionOnSite" | "plusRestaurant" | "restaurantEstimated", values?: { amount: string }) => string;

/**
 * Prix affiché : le prix public en grand ; le prix membre, s'il existe, en mention discrète à côté
 * (étape 28 : l'abonnement n'est plus mis en avant avant la première réservation — auparavant, prix public barré).
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
  budget = null,
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
  /** Consommation libre : budget restaurant estimé (« + resto 200–300 DH » au lieu de « + consommation »). */
  budget?: RestaurantBudget | null;
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
        <span className={`${big} font-bold text-ink`}>{fmt(shown)}</span>
        <span className="text-xs font-medium text-plum-800" data-testid="member-price">
          {fmt(memberAmount + onSite)} {memberLabel}
        </span>
      </span>
    );
  if (!twoPart || !t2) return main;
  const now = price.amount;
  return (
    <span className="inline-flex flex-col gap-0.5" data-two-part={split.model}>
      <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
        {main}
        {split.variable && (
          <span className={`${size === "lg" ? "text-lg" : "text-sm"} font-semibold text-ink`} data-testid="price-budget">
            {budget?.kind === "range" ? t2("plusRestaurant", { amount: budgetText(budget, lang) }) : t2("plusConsumption")}
          </span>
        )}
      </span>
      {detail && <span className="text-xs font-normal text-muted">
        {t2("now", { amount: fmt(now) })} · {split.onSiteUnit != null ? t2("onSite", { amount: fmt(split.onSiteUnit) }) : budget?.kind === "range" ? t2("restaurantEstimated", { amount: budgetText(budget, lang) }) : t2("consumptionOnSite")}
      </span>}
    </span>
  );
}
