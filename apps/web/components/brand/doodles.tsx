import { useId } from "react";

/**
 * Touches dessinées de la direction artistique « Soleil de Casa » (docs/29, étape 7) : petits traits corail
 * (« étincelles ») et trait souligné en dégradé. Purement décoratifs (aria-hidden).
 */
export function Sparks({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" fill="none" stroke="#ff6a4d" strokeWidth="6" strokeLinecap="round" className={`pointer-events-none ${className}`}>
      <path d="M12 10l8 15M33 4v17M53 13l-10 13" />
    </svg>
  );
}

export function Swash({ className = "" }: { className?: string }) {
  const id = "sw" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg aria-hidden viewBox="0 0 300 18" fill="none" preserveAspectRatio="none" className={`pointer-events-none ${className}`}>
      <defs>
        <linearGradient id={id} x1="0" x2="1">
          <stop offset="0" stopColor="#ff6a4d" />
          <stop offset="1" stopColor="#c25be8" />
        </linearGradient>
      </defs>
      <path d="M4 12 C80 2 200 2 296 9" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/** Formes de photo (clipPathUnits = objectBoundingBox) : accroche (ordinateur / téléphone) et bandeau de clôture. */
export function PhotoShapes() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <clipPath id="shape-hero" clipPathUnits="objectBoundingBox">
          <path d="M.2,0 H1 V.84 C.95,.93 .84,.99 .70,.97 C.55,.95 .44,1 .30,.97 C.14,.93 .05,.83 .07,.68 C.09,.56 .01,.48 .03,.36 C.05,.24 .15,.19 .15,.10 C.15,.05 .17,.02 .2,0 Z" />
        </clipPath>
        <clipPath id="shape-hero-m" clipPathUnits="objectBoundingBox">
          <path d="M0,0 H1 V.84 C.86,.97 .68,.91 .52,.95 C.34,1 .16,.96 0,.88 Z" />
        </clipPath>
        <clipPath id="shape-band" clipPathUnits="objectBoundingBox">
          <path d="M0,.30 C.22,.24 .48,.14 .74,.05 C.86,.01 .95,0 1,.04 V.90 C1,.96 .97,1 .93,1 H0 Z" />
        </clipPath>
        <clipPath id="shape-band-m" clipPathUnits="objectBoundingBox">
          <path d="M0,.22 C.3,.12 .65,.02 1,0 V1 H0 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
