import type { Money } from "./types";

/** Crée un montant à partir de dirhams entiers ou décimaux (169 → 16900 centimes). */
export function mad(dirhams: number): Money {
  return { amount: Math.round(dirhams * 100), currency: "MAD" };
}

/**
 * Formate un montant pour l'affichage : « 169 DH » ou « 169,50 DH ».
 * La convention « DH » est celle utilisée au Maroc dans la maquette.
 */
export function formatMoney(money: Money, locale: "fr" | "ar" | "en" = "fr"): string {
  const value = money.amount / 100;
  const hasCents = money.amount % 100 !== 0;
  const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(value);
  return locale === "ar" ? `${formatted} درهم` : `${formatted} DH`;
}
