"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Barre d'onglets défilante : à l'ouverture, l'onglet actif est ramené au centre (sans faire défiler la page). */
export function ActiveTabScroller({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = ref.current;
    const active = list?.querySelector<HTMLElement>("[aria-current=page]");
    if (!list || !active) return;
    const offset = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollLeft = document.documentElement.dir === "rtl" ? -Math.max(0, list.scrollWidth - list.clientWidth - offset) : Math.max(0, offset);
  }, []);
  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
