"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";

export type BrowseEntry = { slug: string; title: string; excerpt: string; theme: string; minutes: number; cover: string; coverPosition?: string };

/** Sans accents, en minuscules : « amitie » trouve « Amitié ». */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** « Tous les articles » : tri Plus lus / Récents, recherche instantanée, grille d'articles avec image (étape 6, docs/29). */
export function BlogBrowser({ popular, recent }: { popular: BrowseEntry[]; recent: BrowseEntry[] }) {
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
      className={`border-b-2 pb-1.5 text-[16px] font-semibold transition ${sort === key ? "border-brand-900 text-ink" : "border-transparent text-muted hover:text-ink"}`}
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
          className="w-full rounded-full border border-line bg-white py-4 ps-13 pe-12 text-[16px] shadow-card outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-100"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label={t("clearSearch")} className="absolute end-3 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-cream-deep">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <p aria-live="polite" className="sr-only">{words.length ? t("results", { count: shown.length }) : ""}</p>
      {shown.length ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {shown.map((e) => (
            <li key={e.slug}>
              <Link href={`/blog/${e.slug}`} className="group flex h-full items-center gap-4 overflow-hidden rounded-[1.25rem] bg-white p-3 shadow-card transition hover:shadow-float sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-[1.75rem] sm:p-2.5">
                {/* Téléphone : ligne compacte, vignette à gauche ; à partir de 640 px : carte avec grande image. */}
                <span className="relative block size-20 shrink-0 overflow-hidden rounded-xl bg-cream-deep sm:aspect-[16/10] sm:size-auto sm:w-full sm:rounded-[1.25rem]">
                  <Image src={e.cover} alt="" fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className={`object-cover transition duration-500 group-hover:scale-[1.03] ${e.coverPosition ?? ""}`} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col sm:px-3 sm:pt-4 sm:pb-3">
                  <span className="text-[11px] font-semibold tracking-[0.12em] text-brand-700 uppercase sm:text-xs">{e.theme} · {t("readTime", { minutes: e.minutes })}</span>
                  <span className="mt-1 block text-[15px] leading-snug font-semibold text-ink group-hover:text-brand-900 sm:mt-2 sm:text-lg">{e.title}</span>
                  <span className="mt-2 line-clamp-2 hidden text-[15px] leading-relaxed text-muted sm:block">{e.excerpt}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState variant="compact" bab="memo" mood="surprised" text={t("noResults")} className="mt-6" />
      )}
    </div>
  );
}
