"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";

type Item = { href: string; label: string; dot?: string };

/**
 * « Découvrir » : menu déroulant ouvert au survol (souris), au clic ou au clavier (Entrée / Espace / flèche bas),
 * fermé avec Échap ou en sortant du menu.
 */
export function DiscoverMenu({ label, menuLabel, items }: { label: string; menuLabel: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
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
      onMouseEnter={() => setOpen(true)}
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
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>(`#${CSS.escape(id)} a`)?.focus());
          }
        }}
        className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[15px] text-ink/85 hover:bg-cream-deep hover:text-ink"
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
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-cream ${i === 0 ? "font-semibold text-plum-900" : "text-ink"}`}
                >
                  {it.dot && <span className={`size-2.5 rounded-full ${it.dot}`} aria-hidden />}
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
