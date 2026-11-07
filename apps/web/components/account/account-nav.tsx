"use client";

import { BadgeCheck, Bell, CalendarDays, History, LayoutDashboard, ReceiptText, SlidersHorizontal, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function AccountNav({ unreadCount }: { unreadCount: number }) {
  const t = useTranslations("account");
  const pathname = usePathname();
  const items = [
    { href: "/espace", label: t("navDashboard"), icon: LayoutDashboard, exact: true },
    { href: "/espace/reservations", label: t("navBookings"), icon: CalendarDays },
    { href: "/espace/notifications", label: t("navNotifications"), icon: Bell, badge: unreadCount },
    { href: "/espace/historique", label: t("navHistory"), icon: History },
    { href: "/espace/factures", label: t("navInvoices"), icon: ReceiptText },
    { href: "/abonnement", label: t("navMembership"), icon: BadgeCheck },
    { href: "/espace/profil", label: t("navProfile"), icon: UserRound },
    { href: "/espace/preferences", label: t("navPreferences"), icon: SlidersHorizontal },
  ];
  return (
    <nav aria-label={t("navLabel")}>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-1 lg:px-0">
        {items.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition lg:rounded-xl ${
                  active ? "bg-plum-900 text-white" : "bg-white/70 text-ink hover:bg-white lg:bg-transparent"
                }`}
              >
                <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                {label}
                {badge ? (
                  <span className={`ms-auto rounded-full px-1.5 text-xs ${active ? "bg-white/20" : "bg-plum-700 text-white"}`}>{badge}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
