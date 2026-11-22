"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { SubscribeButton } from "./subscribe-button";

export type OfferView = {
  id: string;
  months: number;
  price: string;
  perMonth: string;
  reference: string | null;
  saving: string | null;
  savingPercent: number;
  breakEven: number | null;
  highlight: boolean;
  best: boolean;
};

/**
 * Choix de la formule (cartes à faire défiler sur téléphone, grille sur ordinateur) et bouton collant
 * « Devenir membre pour … ». `cta` : ce qui remplace le bouton quand on ne peut pas souscrire (connexion, profil…).
 */
export function OfferPicker({ offers, initialId, mode, cta, renew }: { offers: OfferView[]; initialId: string; mode: "subscribe" | "disabled" | "custom"; cta?: ReactNode; renew: boolean }) {
  const t = useTranslations("membership");
  const [selected, setSelected] = useState(initialId);
  const current = offers.find((o) => o.id === selected) ?? offers[0]!;
  return (
    <>
      <div role="radiogroup" aria-label={t("chooseOffer")} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4" data-testid="membership-offers">
        {offers.map((o) => {
          const on = o.id === selected;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(o.id)}
              className={`relative flex w-[78%] shrink-0 snap-center flex-col items-start rounded-3xl bg-white p-5 text-start shadow-card transition sm:w-auto ${on ? "ring-[3px] ring-brand-800" : "ring-1 ring-line hover:ring-brand-200"}`}
              data-testid="membership-offer"
            >
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${o.highlight ? "bg-brand-900 text-white" : o.best ? "bg-brand-100 text-brand-900" : "bg-cream-deep text-ink"}`}>
                {o.highlight ? t("badgeRecommended") : o.best ? t("badgeBest") : o.months === 1 ? t("badgeFlexible") : t("badgeSave", { percent: o.savingPercent })}
              </span>
              <span className="mt-4 font-display text-2xl font-medium text-brand-900">{t("months", { count: o.months })}</span>
              <span className="mt-2 flex items-baseline gap-1">
                <span className="text-[2rem] leading-none font-bold text-ink">{o.perMonth}</span>
                <span className="text-sm text-muted">{t("perMonth")}</span>
              </span>
              <span className="mt-2 text-sm text-ink/80">
                {o.reference && <s className="me-1.5 text-muted">{o.reference}</s>}
                {o.months === 1 ? t("paidMonth", { price: o.price }) : t("paidOnce", { price: o.price, count: o.months })}
              </span>
              {o.saving && <span className="mt-1 text-sm font-semibold text-brand-800">{t("youSave", { amount: o.saving })}</span>}
              {o.breakEven !== null && <span className="mt-3 text-xs text-muted">{t("breakEven", { count: o.breakEven })}</span>}
              <span className={`absolute end-4 bottom-4 grid size-7 place-items-center rounded-full ${on ? "bg-brand-800 text-white" : "border-2 border-ink/20 bg-white"}`} aria-hidden>
                {on && <Check className="size-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bouton collant, au-dessus de la barre du bas sur téléphone. */}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-2 lg:bottom-6">
        {mode === "subscribe" ? (
          <SubscribeButton offerId={current.id} label={renew ? t("renewOffer", { price: current.price, count: current.months }) : t("subscribeOffer", { price: current.price })} />
        ) : mode === "disabled" ? (
          <button type="button" disabled className="btn btn-primary w-full py-4">{t("subscribeOffer", { price: current.price })}</button>
        ) : (
          cta
        )}
      </div>
    </>
  );
}
