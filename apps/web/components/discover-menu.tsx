"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";

type Item = { href: string; label: string; dot?: string; dotStyle?: CSSProperties };

/**
 * « Découvrir » : menu déroulant ouvert au survol (souris), au clic ou au clavier (Entrée / Espace / flèche bas),
 * fermé avec Échap ou en sortant du menu.
 */
export function DiscoverMenu({ label, menuLabel, items, firstBold = true }: { label: string; menuLabel: string; items: Item[]; firstBold?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  // Ouvert au survol juste avant un clic : le clic ne doit pas le refermer aussitôt.
  const hoveredAt = useRef(0);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => {
        hoveredAt.current = Date.now();
        setOpen(true);
      }}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          root.current?.querySelector("button")?.focus();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => (Date.now() - hoveredAt.current < 500 ? true : !o))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(id)} a`)?.focus());
          }
        }}
        className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[15px] text-ink/85 hover:bg-cream-deep hover:text-ink xl:px-3"
      >
        {label}
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <div id={id} hidden={!open} className="absolute start-0 top-full z-40 pt-2">
        <nav aria-label={menuLabel} className="w-64 rounded-2xl border border-line bg-white p-1.5 shadow-float">
          <ul>
            {items.map((it, i) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream ${i === 0 && firstBold ? "font-semibold text-brand-900" : "text-ink"}`}
                >
                  {it.dot && <span className={`size-2.5 rounded-full ${it.dot}`} style={it.dotStyle} aria-hidden />}
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
