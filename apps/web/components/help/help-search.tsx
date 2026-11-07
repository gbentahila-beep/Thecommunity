"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export type HelpIndexEntry = { slug: string; title: string; summary: string; category: string; text: string };

/** Sans accents, en minuscules : « Réserver » trouve « reserver ». */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Recherche instantanée dans tous les articles ; sans recherche, affiche les catégories (children). */
export function HelpSearch({ index, children }: { index: HelpIndexEntry[]; children: ReactNode }) {
  const t = useTranslations("help");
  const [q, setQ] = useState("");
  const prepared = useMemo(() => index.map((e) => ({ ...e, hay: norm(`${e.title} ${e.summary} ${e.text}`), head: norm(e.title) })), [index]);
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  const results = words.length
    ? prepared
        .filter((e) => words.every((w) => e.hay.includes(w)))
        .sort((a, b) => Number(words.some((w) => b.head.includes(w))) - Number(words.some((w) => a.head.includes(w))))
    : [];
  return (
    <>
      <div className="relative -mt-7 mx-auto max-w-2xl">
        <label htmlFor="help-search" className="sr-only">{t("searchLabel")}</label>
        <Search className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-plum-700" aria-hidden />
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="w-full rounded-full border border-line bg-white py-4 pe-12 ps-13 text-[16px] shadow-float outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("clear")} className="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream-deep">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {words.length ? (
        <section aria-live="polite" className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-muted">{t("results", { count: results.length, q: q.trim() })}</h2>
          {results.length ? (
            <ul className="divide-y divide-line rounded-[var(--radius-card)] bg-white shadow-card">
              {results.map((r) => (
                <li key={r.slug}>
                  <Link href={`/aide/${r.slug}`} className="block p-5 transition hover:bg-cream">
                    <span className="block text-xs font-medium uppercase tracking-wide text-plum-700">{r.category}</span>
                    <span className="mt-1 block font-semibold text-ink">{r.title}</span>
                    <span className="mt-1 block text-sm text-muted">{r.summary}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[var(--radius-card)] bg-white p-5 text-ink/80 shadow-card">{t("noResults")}</p>
          )}
        </section>
      ) : (
        children
      )}
    </>
  );
}
