"use client";

import { useEffect, useRef } from "react";

/** Fait défiler la rangée des thèmes (téléphone) jusqu'au thème actif, sans bouger la page. */
export function ActiveTabScroll({ children, className = "", label }: { children: React.ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current;
    const on = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !on) return;
    const navBox = nav.getBoundingClientRect();
    const box = on.getBoundingClientRect();
    if (box.left < navBox.left || box.right > navBox.right) nav.scrollLeft += box.left - navBox.left - 16;
  }, []);
  return <nav ref={ref} aria-label={label} className={className}>{children}</nav>;
}
