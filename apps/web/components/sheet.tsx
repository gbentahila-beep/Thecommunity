"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Fenêtre commune (docs/16, phase 1) : panneau qui monte du bas sur téléphone, fenêtre centrée sur ordinateur.
 * Échap, la croix ou un clic à côté ferment ; le focus reste dans la fenêtre ; la page ne défile plus derrière.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  children,
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  closeLabel: string;
  children: ReactNode;
  testId?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = panel.current;
    (root?.querySelector<HTMLElement>("[data-autofocus]") ?? root?.querySelector<HTMLElement>("input, select, button"))?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close.current();
      if (e.key !== "Tab" || !root) return;
      const items = [...root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, select, textarea")].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <button type="button" tabIndex={-1} aria-hidden onClick={onClose} className="absolute inset-0 cursor-default bg-ink/30 backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
        className="relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-float motion-safe:animate-[menu-in_180ms_ease-out] sm:max-w-md sm:rounded-3xl sm:pb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-display text-[1.45rem] leading-tight font-medium text-plum-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label={closeLabel} className="-me-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-ink transition hover:bg-cream-deep">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
