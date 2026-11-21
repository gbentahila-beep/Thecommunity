"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { SearchBox } from "./search-box";

/** Recherche de l'en-tête (ordinateur) : une loupe qui ouvre la barre de recherche avec ses suggestions. */
export function HeaderSearch() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [seen, setSeen] = useState(pathname);
  if (seen !== pathname) {
    setSeen(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLInputElement>("input[role=combobox]")?.focus();
    const onDoc = (e: MouseEvent) => root.current && !root.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={root} className="relative">
      <button type="button" aria-label={t("search")} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-full text-ink/80 hover:bg-cream-deep" data-testid="header-search-open">
        {open ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
      </button>
      {open && (
        <div className="absolute end-0 top-full z-40 mt-2 w-[22rem] rounded-2xl border border-line bg-white p-2 shadow-float">
          <SearchBox />
        </div>
      )}
    </div>
  );
}
