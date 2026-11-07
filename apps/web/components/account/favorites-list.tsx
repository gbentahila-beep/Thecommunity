"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

export type FavoriteCandidate = { id: string; slug: string; title: string; district: string; image: string };

export function FavoritesList({ experiences }: { experiences: FavoriteCandidate[] }) {
  const t = useTranslations("history");
  const tc = useTranslations("card");
  const ids = useFavorites();
  const items = experiences.filter((e) => ids.includes(e.id));
  if (items.length === 0) return <p className="rounded-2xl border border-dashed border-line p-6 text-sm text-muted">{t("noFavorites")}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((e) => (
        <li key={e.id} className="relative flex items-center gap-3 rounded-2xl bg-white p-2.5 shadow-card">
          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
            <Image src={e.image} alt="" fill sizes="64px" className="object-cover" />
          </div>
          <Link href={`/experiences/${e.slug}`} className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-ink">{e.title}</span>
            <span className="text-sm text-muted">{e.district}</span>
          </Link>
          <button
            type="button"
            onClick={() => toggleFavorite(e.id)}
            aria-label={tc("removeFavorite")}
            className="grid size-10 place-items-center rounded-full text-plum-700 hover:bg-plum-50"
          >
            <Heart className="size-5 fill-plum-700" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
