export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const CONTACT_EMAIL = "contact@thehostclub.ma"; // hypothèse : domaine à confirmer
export const DEFAULT_CITY = "casablanca";

import type { CSSProperties } from "react";

export type CategoryTone = { text: string; bg: string; dot: string; style?: CSSProperties };

/** Couleurs des cinq univers historiques (palette du site). */
export const CATEGORY_STYLES: Record<string, CategoryTone> = {
  eat: { text: "text-cat-eat", bg: "bg-cat-eat/10", dot: "bg-cat-eat" },
  move: { text: "text-cat-move", bg: "bg-cat-move/10", dot: "bg-cat-move" },
  play: { text: "text-cat-play", bg: "bg-cat-play/10", dot: "bg-cat-play" },
  create: { text: "text-cat-create", bg: "bg-cat-create/10", dot: "bg-cat-create" },
  discover: { text: "text-cat-discover", bg: "bg-cat-discover/10", dot: "bg-cat-discover" },
};

/** Couleur par défaut d'une catégorie créée sans couleur (prune du site). */
export const DEFAULT_CATEGORY_COLOR = "#722637";

/**
 * Étape 19 : couleur d'une catégorie. Les cinq historiques gardent la palette du site, sauf si le super-admin
 * choisit une autre couleur ; les nouvelles catégories utilisent leur couleur (variable CSS --cat).
 */
export function categoryTone(c: { id: string; color?: string | null }): CategoryTone {
  const known = CATEGORY_STYLES[c.id];
  if (known && !c.color) return known;
  return { text: "text-(--cat)", bg: "bg-(--cat)/10", dot: "bg-(--cat)", style: { "--cat": c.color || DEFAULT_CATEGORY_COLOR } as CSSProperties };
}
