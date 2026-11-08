import { MONO_DOT, MONO_PATH, MONO_VIEWBOX } from "./paths";

/** Monogramme « h. » (icônes, petits formats). */
export function MonogramSvg({ className = "", dot = "var(--color-plum-500)", title }: { className?: string; dot?: string; title?: string }) {
  return (
    <svg viewBox={MONO_VIEWBOX} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} className={className} fill="currentColor">
      <path d={MONO_PATH} />
      <circle cx={MONO_DOT.cx} cy={MONO_DOT.cy} r={MONO_DOT.r} fill={dot} />
    </svg>
  );
}
