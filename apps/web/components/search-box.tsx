"use client";

import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type Suggestion = { kind: "experience" | "category" | "organizer"; label: string; href: string; detail?: string };

/**
 * Étape 23 — barre de recherche avec suggestions (expériences, catégories, organisateurs), tolérante aux fautes.
 * Flèches haut/bas pour choisir, Entrée pour ouvrir, Échap pour fermer. Sans JavaScript : simple formulaire
 * qui ouvre le catalogue filtré (/experiences?q=…).
 */
export function SearchBox({ variant = "header", defaultValue = "" }: { variant?: "header" | "page" | "menu"; defaultValue?: string }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/recherche?q=${encodeURIComponent(query)}&locale=${locale}`, { signal: ctrl.signal });
        const data = (await r.json()) as { suggestions: Suggestion[] };
        setItems(data.suggestions);
        setActive(-1);
      } catch {
        /* requête annulée ou hors ligne : on garde les suggestions précédentes */
      }
      setLoading(false);
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, locale]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const query = q.trim();
  const shown = query.length >= 2 ? items : [];
  // Dernière ligne : « Voir tous les résultats ».
  const count = shown.length + (query.length >= 2 ? 1 : 0);
  const allHref = `/experiences?q=${encodeURIComponent(query)}`;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  const kindLabel = { experience: t("kindExperience"), category: t("kindCategory"), organizer: t("kindOrganizer") };
  const prefix = locale === "fr" ? "" : `/${locale}`;

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        action={`${prefix}/experiences`}
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          if (active >= 0 && active < shown.length) return go(shown[active]!.href);
          if (query) go(allHref);
        }}
      >
        <label htmlFor={`${id}-input`} className="sr-only">{t("label")}</label>
        <Search className={`pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink/50 ${variant === "page" ? "size-5" : "size-4"}`} aria-hidden />
        <input
          id={`${id}-input`}
          name="q"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && count > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? `${id}-opt-${active}` : undefined}
          value={q}
          maxLength={80}
          placeholder={t("placeholder")}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => (count ? (a + 1) % count : -1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (count ? (a <= 0 ? count - 1 : a - 1) : -1));
            } else if (e.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
          }}
          className={`w-full rounded-full border border-line bg-white text-ink placeholder:text-ink/45 focus:border-plum-700 focus:outline-none focus:ring-2 focus:ring-plum-200 ${
            variant === "page" ? "py-3.5 ps-11 pe-4 text-base shadow-card" : "py-2 ps-9 pe-3 text-sm"
          }`}
        />
      </form>
      {open && query.length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t("suggestions")}
          className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] min-w-72 overflow-auto rounded-2xl border border-line bg-white p-1.5 shadow-float"
        >
          {shown.map((s, i) => (
            <li key={`${s.kind}-${s.href}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
              <Link
                href={s.href}
                onClick={() => setOpen(false)}
                onMouseEnter={() => setActive(i)}
                className={`flex items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm ${i === active ? "bg-plum-50" : ""}`}
                tabIndex={-1}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">{s.label}</span>
                  {s.detail && <span className="block truncate text-xs text-muted">{s.detail}</span>}
                </span>
                <span className="shrink-0 text-xs text-muted">{kindLabel[s.kind]}</span>
              </Link>
            </li>
          ))}
          {!loading && shown.length === 0 && <li className="px-3 py-2 text-sm text-muted" role="presentation">{t("noSuggestion")}</li>}
          <li id={`${id}-opt-${shown.length}`} role="option" aria-selected={active === shown.length}>
            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              onMouseEnter={() => setActive(shown.length)}
              tabIndex={-1}
              className={`block rounded-xl px-3 py-2 text-sm font-semibold text-plum-900 ${active === shown.length ? "bg-plum-50" : ""}`}
            >
              {t("seeAll", { q: query })}
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
