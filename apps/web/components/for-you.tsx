"use client";

import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { MediaImage as Image } from "@/components/media";
import { Link } from "@/i18n/navigation";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

type Item = { href: string; title: string; detail: string; image: string };

/** Étape 30 — « Pour vous » : suggestions de la personne connectée (rien n'est affiché sinon). */
export function ForYou() {
  const t = useTranslations("forYou");
  const locale = useLocale();
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    let alive = true;
    fetch(`/api/pour-vous?locale=${locale}`)
      .then((r) => r.json())
      .then((d: { items: Item[] }) => alive && setItems(d.items ?? []))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [locale]);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="for-you-title" className="space-y-4" data-testid="for-you">
      <div className="text-center">
        <h2 id="for-you-title" className="card-title">{t("title")}</h2>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>
      {/* Étape Y : même liste que « Cette semaine » et Découvrir (une carte blanche, lignes séparées). */}
      <ul className="card divide-y divide-line/70 overflow-hidden">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex items-center gap-3.5 px-4 py-3.5 transition hover:bg-cream/50">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">{it.title}</span>
                <span className="block truncate text-[13px] text-muted">{it.detail}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-brand-700 rtl:-scale-x-100" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
