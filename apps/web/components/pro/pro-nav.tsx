"use client";

import { CalendarRange, Inbox, LayoutDashboard, Menu, ScanLine, Sparkles, Store, Ticket, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Menu de l'espace organisateur (comptes validés). */
export const PRO_LINKS = [
  { href: "/pro", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/pro/activites", label: "Mes activités", icon: Sparkles },
  { href: "/pro/dates", label: "Dates", icon: CalendarRange },
  { href: "/pro/reservations", label: "Réservations", icon: Ticket },
  { href: "/pro/demandes", label: "Demandes", icon: Inbox },
  { href: "/pro/billets", label: "Billets (pointage)", icon: ScanLine },
  { href: "/pro/profil", label: "Profil public", icon: Store },
] as const;

export function ProNav({ approved, pendingRequests = 0, onNavigate }: { approved: boolean; pendingRequests?: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = approved ? PRO_LINKS : PRO_LINKS.slice(0, 1);
  return (
    <nav aria-label="Espace organisateur">
      <ul className="space-y-1">
        {links.map(({ href, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-medium transition ${active ? "bg-plum-900 text-white" : "text-ink hover:bg-white"}`}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden />
                <span className="flex-1">{label}</span>
                {href === "/pro/demandes" && pendingRequests > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-white text-plum-900" : "bg-plum-900 text-white"}`} aria-label={`${pendingRequests} en attente`}>{pendingRequests}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Menu mobile (bouton ☰ dans l'en-tête). */
export function MobileProMenu({ approved, pendingRequests = 0 }: { approved: boolean; pendingRequests?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="pro-mobile-nav"
        className="grid size-10 place-items-center rounded-full bg-white text-plum-900 shadow-card"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>
      {open && (
        <div id="pro-mobile-nav" className="absolute inset-x-0 top-full z-40 border-b border-line bg-cream p-3 shadow-float">
          <ProNav approved={approved} pendingRequests={pendingRequests} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
