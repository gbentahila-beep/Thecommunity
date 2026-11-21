"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Étape 23 — panneau des filtres du catalogue : en ligne sur ordinateur, plein écran sur téléphone (bouton
 * « Filtres (n) », Échap ou la croix ferment). Les champs vides ne sont pas envoyés : l'adresse reste lisible
 * (/experiences?prix=200&debutant=1).
 */
export function FiltersPanel({
  count,
  labels,
  clearHref,
  children,
  className = "",
}: {
  className?: string;
  count: number;
  labels: { open: string; title: string; apply: string; clear: string; close: string };
  clearHref: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const onSubmit = () => {
      const empty = [...form.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input[name], select[name]")].filter(
        (el) => !el.disabled && (el.value === "" || (el instanceof HTMLInputElement && el.type === "checkbox" && !el.checked)),
      );
      empty.forEach((el) => (el.disabled = true));
      setTimeout(() => empty.forEach((el) => (el.disabled = false)), 0);
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="inline-flex h-12 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-card lg:hidden"
        data-testid="filters-open"
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        {labels.open}
        {count > 0 && <span className="grid size-5 place-items-center rounded-full bg-plum-900 text-[11px] text-white">{count}</span>}
      </button>
      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={labels.title}
        className={`${open ? "fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-white" : "hidden"} lg:static lg:z-auto lg:flex lg:overflow-visible lg:bg-transparent`}
        data-testid="filters-panel"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
          <p className="font-display text-xl font-medium text-plum-900">{labels.title}</p>
          <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="grid size-11 place-items-center rounded-full hover:bg-cream-deep">
            <X className="size-6" aria-hidden />
          </button>
        </div>
        <div className="flex-1 px-5 py-5 lg:p-0">{children}</div>
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-white px-5 py-4 lg:hidden">
          <Link href={clearHref} className="text-sm font-semibold text-plum-900 underline underline-offset-4">{labels.clear}</Link>
          <button type="submit" className="rounded-full bg-plum-900 px-6 py-3 text-sm font-semibold text-white">{labels.apply}</button>
        </div>
      </div>
    </div>
  );
}

/** Liste déroulante qui relance la recherche dès qu'on la change (tri). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
