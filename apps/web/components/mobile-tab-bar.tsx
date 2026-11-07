"use client";

import { Bell, CalendarDays, Compass, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/**
 * Barre d'onglets mobile (maquette). « Messages » est remplacé par « Notifications » (décision D8).
 * Tant que l'authentification n'est pas branchée, les espaces personnels mènent à la connexion.
 */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: t("explore"), icon: Compass, active: !pathname.startsWith("/connexion") && !pathname.startsWith("/inscription") },
    { href: "/connexion?suite=reservations", label: t("bookings"), icon: CalendarDays, active: false },
    { href: "/connexion?suite=notifications", label: t("notifications"), icon: Bell, active: false },
    { href: "/connexion", label: t("profile"), icon: UserRound, active: pathname.startsWith("/connexion") || pathname.startsWith("/inscription") },
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
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${active ? "text-plum-900" : "text-muted"}`}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.6} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
