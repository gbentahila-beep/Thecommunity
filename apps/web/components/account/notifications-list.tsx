"use client";

import type { AppNotification } from "@thecommunity/shared";
import { Bell, CalendarCheck, CreditCard, Sparkles, Star, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { useState } from "react";
import { firebase } from "@/lib/firebase/client";
import { Link } from "@/i18n/navigation";
import { tr } from "@/lib/i18n-text";

const ICONS: Partial<Record<AppNotification["type"], typeof Bell>> = {
  booking_confirmed: CalendarCheck,
  payment_confirmed: CreditCard,
  group_revealed: Users,
  review_request: Star,
  welcome: Sparkles,
};

/** Liste des notifications. Phase 2 : « lu » mémorisé le temps de la visite ; phase 3 : écrit dans Firestore (readAt). */
export function NotificationsList({ initial, nowIso, uid }: { initial: AppNotification[]; nowIso: string; uid?: string }) {
  const t = useTranslations("notificationsPage");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const unread = items.filter((n) => !n.readAt).length;
  const markRead = (id?: string) => {
    const targets = items.filter((n) => !n.readAt && (!id || n.id === id));
    if (targets.length === 0) return;
    setItems((list) => list.map((n) => (targets.some((x) => x.id === n.id) ? { ...n, readAt: new Date().toISOString() } : n)));
    if (uid) {
      // Seul le champ readAt est modifiable (règles Firestore), avec l'heure du serveur.
      const { db } = firebase();
      const batch = writeBatch(db);
      targets.forEach((n) => batch.update(doc(db, "users", uid, "notifications", n.id), { readAt: serverTimestamp() }));
      void batch.commit().catch(() => undefined);
    }
  };
  const rtf = new Intl.RelativeTimeFormat(locale === "ar" ? "ar-MA" : "fr-FR", { numeric: "auto" });
  // « Maintenant » vient du serveur : rendu identique côté serveur et navigateur.
  const now = new Date(nowIso).getTime();
  const ago = (iso: string) => {
    const days = Math.round((new Date(iso).getTime() - now) / 86_400_000);
    if (days === 0) return rtf.format(Math.round((new Date(iso).getTime() - now) / 3_600_000), "hour");
    return rtf.format(days, "day");
  };

  if (items.length === 0) return <p className="text-muted">{t("empty")}</p>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => markRead()}
          disabled={unread === 0}
          className="rounded-full px-4 py-2 text-sm font-medium text-plum-900 hover:bg-white disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
        >
          {t("markAll")}
        </button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-white shadow-card">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          const content = (
            <>
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${n.readAt ? "bg-cream text-muted" : "bg-plum-50 text-plum-900"}`}>
                <Icon className="size-5" strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`font-semibold ${n.readAt ? "text-ink/80" : "text-ink"}`}>{tr(n.title, locale)}</span>
                  {!n.readAt && <span className="size-2 rounded-full bg-plum-700" aria-label={t("unread")} />}
                </span>
                <span className="mt-0.5 block text-sm text-muted">{tr(n.body, locale)}</span>
                <span className="mt-1 block text-xs text-muted/80">{ago(n.createdAt)}</span>
              </span>
            </>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => markRead(n.id)} className="flex gap-4 p-4 hover:bg-cream/50">
                  {content}
                </Link>
              ) : (
                <div className="flex gap-4 p-4">{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
