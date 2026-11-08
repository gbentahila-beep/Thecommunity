"use client";

import { useUnreadCount } from "@/lib/unread";

/** Pastille prune du nombre de notifications non lues (étape 13). Décorative : le nombre est annoncé par le lien. */
export function UnreadBadge({ className = "" }: { className?: string }) {
  const n = useUnreadCount();
  if (n === 0) return null;
  return (
    <span aria-hidden data-testid="unread-badge" className={`pointer-events-none absolute grid h-[18px] min-w-[18px] place-items-center rounded-full bg-plum-700 px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-white ${className}`}>
      {n > 9 ? "9+" : n}
    </span>
  );
}

/** Texte accessible du lien : « Notifications, 2 non lues ». */
export function useUnreadLabel(label: string, format: (n: number) => string): string {
  const n = useUnreadCount();
  return n > 0 ? `${label}, ${format(n)}` : label;
}
