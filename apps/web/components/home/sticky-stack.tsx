"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pile de cartes « qui glissent les unes sur les autres » (position sticky). Sans JavaScript, chaque carte
 * s'accroche sous l'en-tête, légèrement décalée de la précédente (classes CSS des cartes).
 * Avec JavaScript, on corrige un cas : une carte plus haute que l'écran ne s'accroche qu'une fois son bas
 * (et donc son bouton) visible au-dessus de la barre du bas — la suivante ne la recouvre jamais avant.
 */
export function StickyStack({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = ref.current;
    if (!list) return;
    const update = () => {
      const large = window.matchMedia("(min-width: 1024px)").matches;
      const header = large ? 96 : 76;
      const step = large ? 14 : 10;
      const bar = document.querySelector<HTMLElement>("[data-mobile-tab-bar]");
      const barHeight = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().height : 0;
      const room = window.innerHeight - barHeight - 12;
      [...list.children].forEach((child, i) => {
        const el = child as HTMLElement;
        el.style.top = `${Math.min(header + i * step, room - el.offsetHeight)}px`;
      });
    };
    update();
    const observer = new ResizeObserver(update);
    [...list.children].forEach((c) => observer.observe(c));
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <ul ref={ref} className={className} data-testid={testId}>
      {children}
    </ul>
  );
}
