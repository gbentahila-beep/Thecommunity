"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Phrases qui s'écrivent puis s'effacent une à une (effet machine à écrire), en dégradé de la marque.
 * Les lecteurs d'écran reçoivent la liste complète ; avec « réduire les animations », une phrase fixe change toutes les 3 s.
 */
export function Typewriter({ phrases, label }: { phrases: string[]; label: string }) {
  const [i, setI] = useState(0);
  const [n, setN] = useState(0);
  const [erasing, setErasing] = useState(false);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE).matches, () => false);

  useEffect(() => {
    if (!phrases.length) return;
    const full = phrases[i % phrases.length];
    if (reduced) {
      const id = setTimeout(() => setI((x) => x + 1), 3000);
      return () => clearTimeout(id);
    }
    let delay = erasing ? 28 : 55;
    if (!erasing && n === full.length) delay = 1600;
    if (erasing && n === 0) delay = 300;
    const id = setTimeout(() => {
      if (!erasing && n < full.length) setN(n + 1);
      else if (!erasing) setErasing(true);
      else if (n > 0) setN(n - 1);
      else { setErasing(false); setI((x) => x + 1); }
    }, delay);
    return () => clearTimeout(id);
  }, [phrases, i, n, erasing, reduced]);

  const full = phrases.length ? phrases[i % phrases.length] : "";
  const shown = reduced ? full : full.slice(0, n);
  return (
    <div className="mx-auto mt-10 max-w-xl">
      <p className="sr-only">{label} {phrases.join(" · ")}</p>
      <div aria-hidden className="mx-auto flex min-h-16 items-center justify-center rounded-full bg-white px-6 py-4 shadow-card sm:px-8">
        <span className="text-gradient text-start text-[1.15rem] font-semibold tracking-tight sm:text-2xl">
          {shown}
          <span className="ms-0.5 inline-block w-[2px] animate-pulse bg-violet align-[-0.15em] text-transparent motion-reduce:hidden">|</span>
        </span>
      </div>
    </div>
  );
}
