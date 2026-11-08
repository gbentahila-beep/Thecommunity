"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Tool = { title: string; text: string };

/**
 * « Nos outils pour créer du lien » : cartes numérotées qui défilent horizontalement.
 * Au départ seule la flèche « suivant » est active, puis les deux sens ; glisser au doigt fonctionne aussi.
 */
export function ToolsCarousel({ tools, prevLabel, nextLabel, title, text, eyebrow }: {
  tools: Tool[];
  prevLabel: string;
  nextLabel: string;
  title: string;
  text: string;
  eyebrow: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const pos = Math.abs(el.scrollLeft); // négatif en RTL
      setEdges({ start: pos <= 4, end: pos >= max - 4 });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const scroll = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const card = el.querySelector("li")?.getBoundingClientRect().width ?? el.clientWidth * 0.8;
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * (card + 16), behavior: "smooth" });
  };
  const arrow = "grid size-11 place-items-center rounded-full border border-line bg-white text-ink transition hover:border-plum-700 disabled:cursor-default disabled:opacity-35 disabled:hover:border-line";
  return (
    <section aria-labelledby="tools-title" className="py-16">
      <div className="flex items-end justify-between gap-6">
        <div>
          <span className="inline-flex rounded-full bg-gradient-to-r from-plum-100 to-[#f6d9c9] px-4 py-1.5 text-sm font-semibold text-plum-900">{eyebrow}</span>
          <h2 id="tools-title" className="mt-4 font-display text-[2rem] leading-tight font-medium text-plum-900 sm:text-5xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-lg text-ink/75">{text}</p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={prevLabel} className={arrow}>
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={nextLabel} className={arrow}>
            <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      </div>
      <ul ref={list} className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:px-0">
        {tools.map((tool, i) => (
          <li key={tool.title} className="w-[82%] shrink-0 snap-start rounded-[var(--radius-card)] border border-line bg-cream p-6 sm:w-[46%] sm:p-7 lg:w-[31%]">
            <p className="flex items-baseline gap-3">
              <span aria-hidden className="bg-gradient-to-br from-plum-500 to-[#d98a7a] bg-clip-text font-display text-4xl text-transparent">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-lg font-semibold text-ink">{tool.title}</span>
            </p>
            <p className="mt-4 leading-relaxed text-ink/75">{tool.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-end gap-2 sm:hidden">
        <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={prevLabel} className={arrow}>
          <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden />
        </button>
        <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={nextLabel} className={arrow}>
          <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
    </section>
  );
}
