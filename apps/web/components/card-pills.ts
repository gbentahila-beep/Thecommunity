import type { ExperienceBadge, VenueTier } from "@thecommunity/shared";

/**
 * Badges des cartes (audit du 25/11) : une seule apparence, encre sur photo, pour tous les repères ; seul « Dernières
 * places » prend le corail, parce qu'il appelle à agir. Quatre couleurs différentes rendaient la liste bruyante.
 */
const BADGE_BASE = "bg-ink text-white";
export const BADGE_TONE: Record<ExperienceBadge, string> = {
  featured: BADGE_BASE,
  popular: BADGE_BASE,
  new: BADGE_BASE,
  almostFull: "bg-coral text-ink",
  special: BADGE_BASE,
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
