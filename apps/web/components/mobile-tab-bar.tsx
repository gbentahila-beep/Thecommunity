"use client";

import { CalendarDays, Compass, HeartHandshake, House, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { UnreadBadge, useUnreadLabel } from "./unread-badge";

/**
 * Barre d'onglets mobile : Accueil · Découvrir · Mon groupe · Réservations · Menu. Les notifications sont dans la
 * cloche de l'en-tête ; la pastille des non-lues reste aussi sur « Menu » (qui mène au profil et aux notifications).
 * Pas de messagerie (décision D8).
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const menuLabel = useUnreadLabel(t("menu"), (count) => t("unreadCount", { count }));
  const tabs = [
    { href: "/", label: t("home"), icon: House, active: pathname === "/" },
    { href: "/experiences", label: t("discover"), icon: Compass, active: pathname.startsWith("/experiences") || /^\/(casablanca|rabat|marrakech|tanger|agadir)(\/|$)/.test(pathname) },
    { href: "/espace/rencontres", label: t("meet"), icon: HeartHandshake, active: pathname.startsWith("/espace/rencontres") },
    { href: "/espace/reservations", label: t("bookings"), icon: CalendarDays, active: pathname.startsWith("/espace/reservations") },
    { href: "/menu", label: t("menu"), icon: Menu, active: pathname.startsWith("/menu") },
  ];
  return (
    <nav
      data-mobile-tab-bar
      aria-label={t("mobileNav")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={href === "/menu" ? menuLabel : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] leading-4 font-medium ${active ? "text-brand-900" : "text-muted"}`}
            >
              <span className={`relative grid h-7 w-12 place-items-center rounded-full transition ${active ? "bg-brand-100" : ""}`}>
                <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                {href === "/menu" && <UnreadBadge className="-end-0.5 -top-1" />}
              </span>
              <span className="max-w-full truncate px-0.5">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
