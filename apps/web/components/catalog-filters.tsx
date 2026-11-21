"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Filtres du catalogue (docs/16, phase 5) : une petite icône à côté de la ville ouvre un panneau (monte du bas sur
 * téléphone, fenêtre centrée sur ordinateur) ; Échap, la croix ou un clic à côté ferment. Les champs vides ne sont pas envoyés : l'adresse reste lisible
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
    ref.current?.querySelector<HTMLElement>("[data-panel] select, [data-panel] input")?.focus();
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
        aria-label={count > 0 ? `${labels.open} (${count})` : labels.open}
        className="relative grid size-10 place-items-center rounded-full text-plum-900 transition hover:bg-white"
        data-testid="filters-open"
      >
        <SlidersHorizontal className="size-5" aria-hidden />
        {count > 0 && <span className="absolute -end-0.5 -top-0.5 grid size-[18px] place-items-center rounded-full bg-plum-900 text-[10px] font-semibold text-white">{count}</span>}
      </button>
      {/* Le panneau reste dans le formulaire (pas de portail) : « Voir les résultats » l'envoie. */}
      <div className={open ? "fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" : "hidden"}>
        <button type="button" tabIndex={-1} aria-hidden onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-ink/30 backdrop-blur-[2px]" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title}
          data-panel
          className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-float sm:max-w-lg sm:rounded-3xl"
          data-testid="filters-panel"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <p className="font-display text-[1.45rem] font-medium text-plum-900">{labels.title}</p>
            <button type="button" onClick={() => setOpen(false)} aria-label={labels.close} className="-me-2 grid size-10 place-items-center rounded-full hover:bg-cream-deep">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-5">{children}</div>
          <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
            <Link href={clearHref} className="text-sm font-semibold text-plum-900 underline underline-offset-4">{labels.clear}</Link>
            <button type="submit" className="btn btn-primary">{labels.apply}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Liste déroulante qui relance la recherche dès qu'on la change (tri). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
