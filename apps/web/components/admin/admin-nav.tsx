"use client";

import {
  BadgeCheck,
  BadgePercent,
  BarChart3,
  CalendarRange,
  CreditCard,
  Handshake,
  LifeBuoy,
  Mail,
  Inbox,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  ShieldCheck,
  Ticket,
  ScanLine,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/experiences", label: "Expériences", icon: Sparkles },
  { href: "/admin/sessions", label: "Sessions & groupes", icon: CalendarRange },
  { href: "/admin/participations", label: "Demandes de participation", icon: Inbox },
  { href: "/admin/reservations", label: "Réservations", icon: Ticket },
  { href: "/admin/billets", label: "Billets (scan)", icon: ScanLine },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/abonnement", label: "Abonnement", icon: BadgeCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/admin/aide", label: "Centre d'aide", icon: LifeBuoy },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/emails", label: "Boîte d'envoi", icon: Mail },
  { href: "/admin/promos", label: "Codes promo", icon: BadgePercent },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/demandes", label: "Demandes 09-08", icon: ShieldCheck },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Back-office">
      <ul className="space-y-0.5">
        {ADMIN_LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-plum-900 text-white" : "text-ink/80 hover:bg-white hover:text-ink"
                }`}
              >
                <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
