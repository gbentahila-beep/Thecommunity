/**
 * 25/11 — éditions spéciales des Tables (café, brunch, déjeuner, dîner) : Girls only, Expats, New in town. Chacune a
 * son modèle par format (identifiant « <édition>-<format> », ex. « expats-diner ») ; l'équipe les crée à la main, rien
 * d'automatique. Une édition va dans les mêmes restaurants que son format.
 */
export const SPECIAL_EDITIONS = ["girls-only", "expats", "new-in-town"] as const;
export type SpecialEdition = (typeof SPECIAL_EDITIONS)[number];
const RE = new RegExp(`^(${SPECIAL_EDITIONS.join("|")})-`);

/** Format d'origine d'un modèle (« girls-only-diner » → « diner ») ; inchangé pour les autres. */
export function baseFormatId(id: string | null | undefined): string {
  return String(id ?? "").replace(RE, "");
}

/** Édition spéciale d'un modèle, ou null. */
export function specialEditionOf(id: string | null | undefined): SpecialEdition | null {
  const m = RE.exec(String(id ?? ""));
  return m ? (m[1] as SpecialEdition) : null;
}
