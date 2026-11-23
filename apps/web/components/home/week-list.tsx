"use client";

import { useState, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { EmptyState } from "@/components/empty-state";

export type WeekItem = { id: string; categories: string[]; node: ReactNode };
export type WeekChip = { id: string | null; label: string; icon?: ReactNode };

/**
 * « Cette semaine à … » : pastilles d'univers qui filtrent la liste sur place (sans recharger la page),
 * puis les lignes compactes (au plus `limit`) et « Voir toutes les expériences ».
 */
export function WeekList({ chips, items, limit, seeAll, empty }: { chips: WeekChip[]; items: WeekItem[]; limit: number; seeAll: { href: string; label: string }; empty: string }) {
  const [active, setActive] = useState<string | null>(null);
  const shown = items.filter((i) => !active || i.categories.includes(active)).slice(0, limit);
  return (
    <div className="space-y-5">
      <div role="toolbar" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0" data-testid="week-chips">
        {chips.map((c) => (
          <button key={c.id ?? "all"} type="button" aria-pressed={active === c.id} onClick={() => setActive(c.id)} className={`chip ${active === c.id ? "chip-on" : ""}`}>
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>
      {shown.length > 0 ? (
        <ul className={`event-list ${shown.length < 3 ? "is-few" : ""}`} data-testid="week-list">
          {shown.map((i) => (
            <li key={i.id}>{i.node}</li>
          ))}
        </ul>
      ) : (
        <EmptyState variant="compact" bab="pixel" mood="sleep" text={empty} />
      )}
      <div className="text-center">
        <Link href={seeAll.href} className="btn btn-secondary">
          {seeAll.label}
        </Link>
      </div>
    </div>
  );
}
