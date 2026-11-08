"use client";

import { Bell, CalendarDays, Compass, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { UnreadBadge, useUnreadLabel } from "./unread-badge";

/**
 * Barre d'onglets mobile (maquette). « Messages » est remplacé par « Notifications » (décision D8).
 * Phase 2 : l'espace membre affiche le compte de démonstration ; phase 3 : protégé par la connexion.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const notifLabel = useUnreadLabel(t("notifications"), (count) => t("unreadCount", { count }));
  const inSpace = pathname.startsWith("/espace") || pathname.startsWith("/bienvenue");
  const tabs = [
    { href: "/", label: t("explore"), icon: Compass, active: !inSpace && !pathname.startsWith("/connexion") && !pathname.startsWith("/inscription") },
    { href: "/espace/reservations", label: t("bookings"), icon: CalendarDays, active: pathname.startsWith("/espace/reservations") },
    { href: "/espace/notifications", label: t("notifications"), icon: Bell, active: pathname.startsWith("/espace/notifications") },
    {
      href: "/espace",
      label: t("profile"),
      icon: UserRound,
      active: inSpace && !pathname.startsWith("/espace/reservations") && !pathname.startsWith("/espace/notifications"),
    },
  ];
  return (
    <nav
      aria-label={t("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={href === "/espace/notifications" ? notifLabel : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-plum-900" : "text-muted"}`}
            >
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                {href === "/espace/notifications" && <UnreadBadge className="-end-2.5 -top-1.5" />}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
