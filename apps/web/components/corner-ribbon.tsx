import type { ExperienceBadge } from "@thecommunity/shared";
import { BADGE_TONE } from "./card-pills";

/**
 * Étape Q : le badge est une petite étiquette inclinée posée à cheval sur le coin haut gauche de la photo (comme un
 * autocollant), sur les vignettes comme sur les grandes photos (choix du 23/11). Lisible même sur une vignette de 64 px, et la ligne de texte
 * reste libre. Le parent doit être `relative` SANS overflow-hidden (l'étiquette déborde du coin).
 */
export function CornerRibbon({ badge, label, size = "sm" }: { badge: ExperienceBadge; label: string; size?: "sm" | "md" }) {
  // Vignette (sm) : à cheval sur le coin haut gauche, inclinée ; dans la grille d'ordinateur, style des cartes (globals.css).
  const dims =
    size === "md"
      ? "top-3 start-3 -rotate-6 rtl:rotate-6 px-2.5 py-1.5 text-[11px] tracking-[0.05em]"
      : "-top-1.5 -start-1.5 -rotate-6 rtl:rotate-6 px-1.5 py-[4px] text-[8.5px] sm:text-[9px] tracking-[0.05em] ev-ribbon";
  return (
    <span
      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-md font-bold uppercase leading-none shadow-[0_3px_8px_rgba(0,0,0,0.22)] ring-2 ring-white ${dims} ${BADGE_TONE[badge]}`}
      data-testid="card-badge"
    >
      {label}
    </span>
  );
}
