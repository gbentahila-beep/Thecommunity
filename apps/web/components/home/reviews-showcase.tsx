"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { Stars } from "@/components/ui";

type Review = { id: string; rating: number; comment: string; publicName: string };

/**
 * « Pourquoi venir » : une grande photo et des avis en cartes posées dessus (ordinateur),
 * ou en carrousel sous la photo avec flèches (téléphone).
 */
export function ReviewsShowcase({ reviews, title, subtitle, photoAlt, prevLabel, nextLabel }: {
  reviews: Review[];
  title: string;
  subtitle: string;
  photoAlt: string;
  prevLabel: string;
  nextLabel: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = list.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <section aria-labelledby="reviews-title" className="py-16">
      <h2 id="reviews-title" className="text-center font-display text-[1.75rem] leading-tight font-medium text-plum-900 sm:text-[2.25rem]">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-ink/75">{subtitle}</p>
      <div className="relative mt-8">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-card sm:aspect-[16/9] lg:aspect-[21/9]">
          <Image src="/images/photos/pourquoi-venir.webp" alt={photoAlt} fill sizes="100vw" className="object-cover object-[50%_30%]" />
        </div>
        <ul
          ref={list}
          className="-mt-16 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:-mt-28 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-8"
        >
          {reviews.map((r) => (
            <li key={r.id} className="relative w-[85%] shrink-0 snap-center rounded-[var(--radius-card)] bg-white p-6 shadow-float sm:w-[60%] lg:w-auto">
              <Stars value={r.rating} />
              <blockquote className="mt-4 font-display text-lg leading-relaxed text-ink">« {r.comment} »</blockquote>
              <p className="mt-4 text-sm font-medium text-muted">{r.publicName}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-end gap-2 px-4 lg:hidden">
          <button type="button" onClick={() => scroll(-1)} aria-label={prevLabel} className="grid size-10 place-items-center rounded-full border border-line bg-white text-plum-900">
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label={nextLabel} className="grid size-10 place-items-center rounded-full border border-line bg-white text-plum-900">
            <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  );
}
