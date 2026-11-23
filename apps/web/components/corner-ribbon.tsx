import type { ExperienceBadge } from "@thecommunity/shared";
import { BADGE_TONE } from "./card-pills";

/**
 * Étape Q : le badge est une petite étiquette inclinée, posée à cheval sur le coin haut gauche de la photo
 * (comme un autocollant). Toujours au même endroit, lisible même sur une vignette de 64 px, et la ligne de texte
 * reste libre. Le parent doit être `relative` SANS overflow-hidden (l'étiquette déborde du coin).
 */
export function CornerRibbon({ badge, label, size = "sm" }: { badge: ExperienceBadge; label: string; size?: "sm" | "md" }) {
  const dims = size === "md" ? "top-3 start-3 px-2.5 py-1.5 text-[11px]" : "-top-1.5 -start-1.5 px-1.5 py-[4px] text-[8.5px] sm:text-[9px]";
  return (
    <span
      className={`pointer-events-none absolute z-10 -rotate-6 whitespace-nowrap rounded-md font-bold uppercase leading-none tracking-[0.05em] shadow-[0_3px_8px_rgba(0,0,0,0.22)] ring-2 ring-white rtl:rotate-6 ${dims} ${BADGE_TONE[badge]}`}
      data-testid="card-badge"
    >
      {label}
    </span>
  );
}
