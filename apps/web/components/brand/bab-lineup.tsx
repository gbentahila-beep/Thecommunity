import { useId } from "react";
import { Bab, type BabMood, type BabName } from "./bab";
import { BAB_BODY, BAB_VIEWBOX } from "./bab-art";

/** Ordre de la lignée : trois Babs, la place libre, trois Babs. Les deux voisins se penchent vers la place. */
const LEFT: { name: BabName; mood: BabMood; tilt?: number; hop?: boolean }[] = [
  { name: "toast", mood: "happy" },
  { name: "sprint", mood: "big", hop: true },
  { name: "pixel", mood: "wink", tilt: 7 },
];
const RIGHT: { name: BabName; mood: BabMood; tilt?: number; hop?: boolean }[] = [
  { name: "doodle", mood: "happy", tilt: -7 },
  { name: "scout", mood: "big" },
  { name: "memo", mood: "happy", hop: true },
];

/** Sur téléphone : quatre Babs autour de la place (plus grands) ; à partir de 640 px : les six. */
const slot = "block w-[15vw] max-w-20 shrink-0 sm:w-[11vw]";

/**
 * Lignée de Babs avec une place libre au milieu (docs/22-babs.md) : sépare deux blocs et dit « il y a une place
 * pour vous ». Purement décoratif, animé en CSS (immobile si l'appareil demande de réduire les animations).
 */
export function BabLineup({ seatLabel, caption, className = "" }: { seatLabel: string; caption?: string; className?: string }) {
  const id = "seat" + useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bab = (b: (typeof LEFT)[number], i: number) => (
    <span key={b.name} className={`${slot} ${b.hop ? "bab-hop" : "bab-bob"} ${i === 0 || i === 5 ? "max-sm:hidden" : ""}`} style={{ animationDelay: `${-i * 0.55}s` }}>
      <Bab name={b.name} mood={b.mood} tilt={b.tilt} />
    </span>
  );
  return (
    <div className={`mx-auto w-full max-w-3xl ${className}`} aria-hidden>
      <div className="flex items-end justify-center gap-[min(1.6vw,18px)]">
        {LEFT.map(bab)}
        <span className={`${slot} relative`}>
          <span className="bab-chip absolute start-1/2 bottom-full z-10 mb-1 -translate-x-1/2 rounded-full bg-gradient-brand px-3 py-1 text-[11px] font-semibold whitespace-nowrap text-ink shadow-[0_8px_18px_-10px_rgb(194_91_232/0.7)] sm:text-xs rtl:translate-x-1/2">
            {seatLabel}
          </span>
          <svg viewBox={BAB_VIEWBOX} className="h-auto w-full">
            <defs>
              <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FF6A4D" />
                <stop offset="1" stopColor="#C25BE8" />
              </linearGradient>
            </defs>
            <ellipse cx="60" cy="134" rx="36" ry="4.5" fill="#000" opacity=".08" />
            <path d={BAB_BODY} fill={`url(#${id}g)`} fillOpacity=".1" />
            <path className="bab-march" d={BAB_BODY} fill="none" stroke={`url(#${id}g)`} strokeWidth="4" strokeDasharray="9 7" strokeLinecap="round" />
            <path
              transform="translate(60 8)"
              d="M0 -8 C1.4 -1.4 1.4 -1.4 8 0 C1.4 1.4 1.4 1.4 0 8 C-1.4 1.4 -1.4 1.4 -8 0 C-1.4 -1.4 -1.4 -1.4 0 -8Z"
              fill={`url(#${id}g)`}
            />
            <path d="M48 76 H72 M60 64 V88" stroke={`url(#${id}g)`} strokeWidth="5" strokeLinecap="round" opacity=".55" />
          </svg>
        </span>
        {RIGHT.map((b, i) => bab(b, i + 3))}
      </div>
      <div className="mt-1 h-px bg-[linear-gradient(90deg,transparent,var(--color-line)_15%,var(--color-line)_85%,transparent)]" />
      {caption && <p className="mt-3 text-center font-hand text-[1.75rem] leading-tight font-bold text-brand-700">{caption}</p>}
    </div>
  );
}
