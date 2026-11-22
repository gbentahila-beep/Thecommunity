import { formatMoney, type Experience, type ExperiencePricing, type MembershipPlan, type Money, type RestaurantBudget } from "@thecommunity/shared";

/** « 200–300 DH » (fourchette) ou « 299 DH » (montant exact). */
export function budgetText(b: RestaurantBudget, lang: "fr" | "ar" | "en"): string {
  if (b.kind === "fixed") return formatMoney({ amount: b.amount, currency: b.currency }, lang);
  return `${Math.round(b.min / 100)}–${formatMoney({ amount: b.max, currency: b.currency }, lang)}`;
}

/** Prix membre d'une place pour cette expérience, si une formule d'abonnement est proposée (sinon null). */
/** docs/22 : plus de prix membre (le pass inclut la place, le carnet la règle) ; gardé pour les anciens appels. */
export function memberAmountFor(plan: MembershipPlan | null, publicPrice: Money, experience: Pick<Experience, "memberPrice">): number | null {
  void [plan, publicPrice, experience];
  return null;
}

/** Traductions de l'espace « twoPart » (passées par la page, qui a déjà son traducteur). */
export type TwoPartT = (key: "now" | "onSite" | "plusConsumption" | "consumptionOnSite" | "plusRestaurant" | "restaurantEstimated" | "plusOnSite", values?: { amount: string }) => string;

/** « Sur place : … » d'une expérience (docs/22) : montant fixe, budget estimé, ou consommation ; null si rien sur place. */
export function onSiteText(pricing: ExperiencePricing | null | undefined, budget: RestaurantBudget | null, lang: "fr" | "ar" | "en", t: (key: "sectionFixed" | "sectionBudget" | "sectionVariable", values?: { amount: string }) => string): string | null {
  if (!pricing || pricing.model === "online_only") return null;
  if (pricing.model === "fixed_partner" && pricing.partner?.price) return t("sectionFixed", { amount: formatMoney(pricing.partner.price, lang) });
  if (budget?.kind === "range") return t("sectionBudget", { amount: budgetText(budget, lang) });
  return t("sectionVariable");
}

/**
 * Prix affiché (docs/22, décision 1) : un seul chiffre, le prix payé en ligne (35 DH), et une petite mention
 * « + sur place » quand quelque chose se règle au lieu. Le détail (montant, budget) est dit une seule fois, dans
 * l'encadré « Ce que vous payez » de la fiche et du tunnel. Plus de prix membre affiché.
 */
export function PriceTag({
  price,
  lang,
  size = "md",
  pricing,
  t2,
}: {
  price: Money;
  /** Ancien prix membre : n'est plus affiché (gardé pour compatibilité des appels). */
  memberAmount?: number | null;
  lang: "fr" | "ar" | "en";
  memberLabel?: string;
  size?: "md" | "lg";
  pricing?: ExperiencePricing | null;
  t2?: TwoPartT;
  detail?: boolean;
  budget?: RestaurantBudget | null;
}) {
  const onSite = Boolean(pricing && pricing.model !== "online_only");
  const big = size === "lg" ? "text-3xl" : "text-lg";
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5" data-two-part={pricing?.model ?? "online_only"}>
      <span className={`${big} font-bold text-ink`}>{formatMoney({ amount: price.amount, currency: price.currency }, lang)}</span>
      {onSite && t2 && <span className="text-xs font-medium text-muted" data-testid="price-on-site">{t2("plusOnSite")}</span>}
    </span>
  );
}
