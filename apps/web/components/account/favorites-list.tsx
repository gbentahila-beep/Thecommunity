"use client";

import { Heart } from "lucide-react";
import { MediaImage as Image } from "@/components/media";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

/** Ordre décidé côté serveur : date à venir (la plus proche d'abord), sans date, puis archivées (5j). */
export type FavoriteCandidate = { id: string; slug: string; title: string; district: string; image: string; status: "dated" | "noDate" | "archived"; when: string | null };

export function FavoritesList({ experiences }: { experiences: FavoriteCandidate[] }) {
  const t = useTranslations("history");
  const tc = useTranslations("card");
  const ids = useFavorites();
  const items = experiences.filter((e) => ids.includes(e.id));
  if (items.length === 0) return <EmptyState variant="compact" bab="toast" mood="wink" text={t("noFavorites")} />;
  return (
    <ul className="card divide-y divide-line/70 overflow-hidden" data-testid="favorites-list">
      {items.map((e) => (
        <li key={e.id} className="relative flex min-w-0 items-center gap-3.5 px-4 py-3.5">
          <div className={`relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream-deep ${e.status === "archived" ? "opacity-60 grayscale" : ""}`}>
            <Image src={e.image} alt="" fill sizes="64px" className="object-cover" />
          </div>
          <Link href={`/experiences/${e.slug}`} className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-ink">{e.title}</span>
            <span className="block text-sm text-muted">{e.district}</span>
            {e.status === "archived" ? (
              <span className="mt-1 inline-block rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">{t("favArchived")}</span>
            ) : (
              <span className={`mt-0.5 block text-xs font-medium ${e.status === "dated" ? "text-brand-700" : "text-muted"}`}>
                {e.status === "dated" ? t("favNext", { date: e.when ?? "" }) : t("favNoDate")}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => toggleFavorite(e.id)}
            aria-label={tc("removeFavorite")}
            className="grid size-10 place-items-center rounded-full text-brand-700 hover:bg-brand-50"
          >
            <Heart className="size-5 fill-brand-700" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
