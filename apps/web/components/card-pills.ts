import type { ExperienceBadge, VenueTier } from "@thecommunity/shared";

/**
 * Étape O : repères visibles dès la carte. Chaque badge a sa couleur (on ne voit plus « Nouveau » partout),
 * chaque gamme son style (Exclusive se remarque), et « Réservé aux femmes » est toujours affiché.
 */
export const BADGE_TONE: Record<ExperienceBadge, string> = {
  featured: "bg-gradient-to-r from-[#f2705a] to-brand-500 text-white",
  popular: "bg-amber-400 text-ink",
  new: "bg-emerald-700 text-white",
  almostFull: "bg-rose-600 text-white",
  special: "bg-sky-600 text-white",
};

export const TIER_TONE: Record<VenueTier, string> = {
  casual: "bg-white text-ink ring-1 ring-line",
  premium: "bg-amber-100 text-amber-900 ring-1 ring-amber-300",
  exclusive: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

export const WOMEN_TONE = "bg-rose-100 text-rose-900 ring-1 ring-rose-200";

/** Gamme en texte coloré (lignes de liste) : discrète mais reconnaissable. */
export const TIER_TEXT: Record<VenueTier, string> = {
  casual: "text-ink/70",
  premium: "text-amber-700",
  exclusive: "text-brand-700",
};
