import { formatMoney, memberUnitPrice, type Experience, type MembershipPlan, type Money } from "@thecommunity/shared";

/** Prix membre d'une place pour cette expérience, si une formule d'abonnement est proposée (sinon null). */
export function memberAmountFor(plan: MembershipPlan | null, publicPrice: Money, experience: Pick<Experience, "memberPrice">): number | null {
  if (!plan) return null;
  const m = memberUnitPrice(publicPrice.amount, plan, experience.memberPrice?.amount ?? null);
  return m < publicPrice.amount ? m : null;
}

/**
 * Prix affiché : le prix public BARRÉ à côté du prix membre (argument de vente de l'abonnement),
 * ou le prix public seul s'il n'y a pas de prix membre.
 */
export function PriceTag({
  price,
  memberAmount,
  lang,
  memberLabel,
  size = "md",
}: {
  price: Money;
  memberAmount: number | null;
  lang: "fr" | "ar" | "en";
  memberLabel: string;
  size?: "md" | "lg";
}) {
  const big = size === "lg" ? "text-3xl" : "text-lg";
  if (memberAmount === null) return <span className={`${big} font-bold text-ink`}>{formatMoney(price, lang)}</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <s className={`${size === "lg" ? "text-lg" : "text-sm"} text-muted decoration-plum-700/60`} aria-label={`${formatMoney(price, lang)}`}>
        {formatMoney(price, lang)}
      </s>
      <span className={`${big} font-bold text-plum-900`}>{formatMoney({ amount: memberAmount, currency: price.currency }, lang)}</span>
      <span className="rounded-full bg-plum-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-plum-900">{memberLabel}</span>
    </span>
  );
}
