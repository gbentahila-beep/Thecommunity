"use client";

import { ChevronRight, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";

export type BrowseEntry = { slug: string; title: string; excerpt: string; theme: string; minutes: number };

/** Sans accents, en minuscules : « amitie » trouve « Amitié ». */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « Parcourir les articles » : tri Plus lus / Récents et recherche instantanée. */
export function BlogBrowser({ popular, recent, contentLang }: { popular: BrowseEntry[]; recent: BrowseEntry[]; contentLang?: "fr" }) {
  const t = useTranslations("blog");
  const [sort, setSort] = useState<"popular" | "recent">("popular");
  const [q, setQ] = useState("");
  const words = norm(q).split(/\s+/).filter((w) => w.length > 1);
  const list = sort === "popular" ? popular : recent;
  const prepared = useMemo(() => list.map((e) => ({ ...e, hay: norm(`${e.title} ${e.excerpt} ${e.theme}`) })), [list]);
  const shown = words.length ? prepared.filter((e) => words.every((w) => e.hay.includes(w))) : prepared;
  const tab = (key: "popular" | "recent", label: string) => (
    <button
      type="button"
      aria-pressed={sort === key}
      onClick={() => setSort(key)}
      className={`border-b-2 pb-1.5 text-[16px] font-semibold transition ${sort === key ? "border-plum-900 text-ink" : "border-transparent text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div role="group" aria-label={t("sortLabel")} className="flex gap-6">
        {tab("popular", t("sortPopular"))}
        {tab("recent", t("sortRecent"))}
      </div>
      <div className="relative mt-6">
        <label htmlFor="blog-search" className="sr-only">{t("searchLabel")}</label>
        <Search className="pointer-events-none absolute start-5 top-1/2 size-5 -translate-y-1/2 text-ink/70" aria-hidden />
        <input
          id="blog-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchPlaceholder")}
          autoComplete="off"
          className="w-full rounded-full border border-line bg-white py-4 ps-13 pe-12 text-[16px] shadow-card outline-none focus:border-plum-700 focus:ring-2 focus:ring-plum-100"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("clearSearch")} className="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream-deep">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{words.length ? t("results", { count: shown.length }) : ""}</p>
      {shown.length ? (
        <ul className="mt-4 divide-y divide-line">
          {shown.map((e) => (
            <li key={e.slug}>
              <Link href={`/blog/${e.slug}`} className="group flex items-center justify-between gap-4 py-5">
                <span className="min-w-0" lang={contentLang} dir={contentLang ? "ltr" : undefined}>
                  <span className="block text-[17px] leading-snug font-semibold text-ink group-hover:text-plum-900 sm:text-xl">{e.title}</span>
                  <span className="mt-1 block text-sm text-muted">{e.theme} · {t("readTime", { minutes: e.minutes })}</span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-ink/70 transition group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-[var(--radius-card)] bg-white p-5 text-ink/80 shadow-card">{t("noResults")}</p>
      )}
    </div>
  );
}
