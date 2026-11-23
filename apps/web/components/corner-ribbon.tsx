import type { ExperienceBadge } from "@thecommunity/shared";
import { BADGE_TONE } from "./card-pills";

/**
 * Étape Q : le badge est une petite étiquette inclinée posée sur la photo (comme un autocollant) : au coin haut
 * gauche sur les grandes photos (et les cartes sur ordinateur), centrée sur le bord bas des vignettes. Toujours au même endroit, lisible même sur une vignette de 64 px, et la ligne de texte
 * reste libre. Le parent doit être `relative` SANS overflow-hidden (l'étiquette déborde du coin).
 */
export function CornerRibbon({ badge, label, size = "sm" }: { badge: ExperienceBadge; label: string; size?: "sm" | "md" }) {
  // Vignette (sm) : l'étiquette est centrée sous la photo, à cheval sur son bord bas : elle ne déborde que de quelques
  // pixels de chaque côté et ne touche jamais le titre, même « Coup de cœur » sur ordinateur.
  const dims =
    size === "md"
      ? "top-3 start-3 -rotate-6 rtl:rotate-6 px-2.5 py-1.5 text-[11px] tracking-[0.05em]"
      : "-bottom-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 -rotate-3 rtl:rotate-3 px-1.5 py-[3px] text-[8px] tracking-[0.02em] lg:start-3 lg:top-3 lg:bottom-auto lg:translate-x-0 lg:-rotate-6 lg:px-2.5 lg:py-1.5 lg:text-[11px] lg:tracking-[0.05em] rtl:lg:translate-x-0 rtl:lg:rotate-6";
  return (
    <span
      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-md font-bold uppercase leading-none shadow-[0_3px_8px_rgba(0,0,0,0.22)] ring-2 ring-white ${dims} ${BADGE_TONE[badge]}`}
      data-testid="card-badge"
    >
      {label}
    </span>
  );
}
