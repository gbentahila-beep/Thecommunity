"use client";

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
      <div>
        <h2 id="for-you-title" className="font-display text-2xl font-medium text-brand-900">{t("title")}</h2>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((it) => (
          <li key={it.href}>
            <Link href={it.href} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-card transition hover:shadow-float">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                {it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{it.title}</span>
                <span className="block truncate text-sm text-muted">{it.detail}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
