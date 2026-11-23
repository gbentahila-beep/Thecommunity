"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { SubscribeButton } from "./subscribe-button";

export type OfferView = {
  id: string;
  kind: "pass" | "carnet";
  title: string;
  price: string;
  perMonth: string | null;
  note: string | null;
  highlight: boolean;
  /** Affichée d'emblée (Carnet, Pass 1 mois, Pass 6 mois) ; les autres durées sous « Autres durées ». */
  main: boolean;
};

/**
 * Choix du carnet ou du pass (docs/22 § 9) : Carnet, Pass 1 mois, Pass 6 mois (mis en avant), puis « Autres durées ».
 * Bouton collant « Acheter … ». `cta` : ce qui remplace le bouton quand on ne peut pas acheter (connexion, profil…).
 */
export function OfferPicker({ offers, initialId, mode, cta }: { offers: OfferView[]; initialId: string; mode: "subscribe" | "disabled" | "custom"; cta?: ReactNode }) {
  const t = useTranslations("pass");
  const [selected, setSelected] = useState(initialId);
  const [more, setMore] = useState(false);
  const current = offers.find((o) => o.id === selected) ?? offers[0]!;
  const shown = offers.filter((o) => o.main || more || o.id === selected);
  return (
    <>
      <div role="radiogroup" aria-label={t("choose")} className="grid gap-3 sm:grid-cols-3" data-testid="membership-offers">
        {shown.map((o) => {
          const on = o.id === selected;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(o.id)}
              className={`relative flex flex-col items-center rounded-3xl bg-white p-5 pb-12 text-center shadow-card transition ${on ? "ring-[3px] ring-brand-800" : "ring-1 ring-line hover:ring-brand-200"}`}
              data-testid="membership-offer"
            >
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${o.highlight ? "bg-brand-900 text-white" : "bg-cream-deep text-ink"}`}>
                {o.highlight ? t("badgeRecommended") : o.kind === "carnet" ? t("badgeCarnet") : t("badgePass")}
              </span>
              <span className="mt-4 card-title">{o.title}</span>
              <span className="mt-2 text-[2rem] leading-none font-bold text-ink">{o.price}</span>
              {o.perMonth && <span className="mt-1 text-sm text-muted">{t("perMonth", { price: o.perMonth })}</span>}
              {o.note && <span className="mt-2 text-sm font-semibold text-brand-800">{o.note}</span>}
              <span className={`absolute start-1/2 bottom-4 grid size-7 -translate-x-1/2 place-items-center rounded-full rtl:translate-x-1/2 ${on ? "bg-brand-800 text-white" : "border-2 border-ink/20 bg-white"}`} aria-hidden>
                {on && <Check className="size-4" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      {offers.some((o) => !o.main) && (
        <button type="button" onClick={() => setMore((m) => !m)} className="mx-auto mt-3 block text-sm font-semibold text-brand-900 underline underline-offset-4" data-testid="more-offers">
          {more ? t("lessDurations") : t("moreDurations")}
        </button>
      )}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-3 lg:bottom-6">
        {mode === "subscribe" ? (
          <SubscribeButton offerId={current.id} label={t("buy", { offer: current.title, price: current.price })} />
        ) : mode === "disabled" ? (
          <button type="button" disabled className="btn btn-primary w-full py-4">{t("buy", { offer: current.title, price: current.price })}</button>
        ) : (
          cta
        )}
      </div>
    </>
  );
}
