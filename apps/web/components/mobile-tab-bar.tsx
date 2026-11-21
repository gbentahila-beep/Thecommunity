"use client";

import { CalendarDays, Compass, HeartHandshake, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { UnreadBadge, useUnreadLabel } from "./unread-badge";

/**
 * Barre d'onglets mobile. Étape 32 : Découvrir · Mes rencontres · Réservations · Profil ; les notifications passent
 * dans la cloche de l'en-tête (la pastille des non-lues reste aussi sur « Profil »). Pas de messagerie (décision D8).
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const profileLabel = useUnreadLabel(t("profile"), (count) => t("unreadCount", { count }));
  const inSpace = pathname.startsWith("/espace") || pathname.startsWith("/bienvenue");
  const tabs = [
    { href: "/", label: t("discover"), icon: Compass, active: !inSpace && !pathname.startsWith("/connexion") && !pathname.startsWith("/inscription") },
    { href: "/espace/rencontres", label: t("meet"), icon: HeartHandshake, active: pathname.startsWith("/espace/rencontres") },
    { href: "/espace/reservations", label: t("bookings"), icon: CalendarDays, active: pathname.startsWith("/espace/reservations") },
    {
      href: "/espace",
      label: t("profile"),
      icon: UserRound,
      active: inSpace && !pathname.startsWith("/espace/reservations") && !pathname.startsWith("/espace/rencontres"),
    },
  ];
  return (
    <nav
      data-mobile-tab-bar
      aria-label={t("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={href === "/espace" ? profileLabel : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] leading-4 font-medium ${active ? "text-plum-900" : "text-muted"}`}
            >
              <span className="relative">
                <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                {href === "/espace" && <UnreadBadge className="-end-2.5 -top-1.5" />}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
