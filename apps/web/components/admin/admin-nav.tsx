"use client";

import {
  BadgeCheck,
  BadgePercent,
  BarChart3,
  CalendarRange,
  CreditCard,
  Handshake,
  House,
  LifeBuoy,
  Mail,
  Inbox,
  Lightbulb,
  Landmark,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  ShieldCheck,
  Store,
  Percent,
  Banknote,
  Undo2,
  Ticket,
  ScanLine,
  Users,
  Wallet,
  LayoutTemplate,
  CalendarCheck,
  Route,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, exact: true },
  { href: "/admin/aujourdhui", label: "Aujourd'hui", icon: CalendarCheck },
  { href: "/admin/attribution", label: "Attribution des lieux", icon: Route },
  { href: "/admin/experiences", label: "Expériences", icon: Sparkles },
  { href: "/admin/modeles", label: "Modèles", icon: LayoutTemplate },
  { href: "/admin/sessions", label: "Sessions & groupes", icon: CalendarRange },
  { href: "/admin/participations", label: "Demandes de participation", icon: Inbox },
  { href: "/admin/propositions", label: "Sorties proposées", icon: Lightbulb },
  { href: "/admin/reservations", label: "Réservations", icon: Ticket },
  { href: "/admin/billets", label: "Billets (scan)", icon: ScanLine },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/abonnement", label: "Carnet et Pass", icon: BadgeCheck },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/partenaires", label: "Partenaires", icon: Handshake },
  { href: "/admin/organisateurs", label: "Organisateurs", icon: Store },
  { href: "/admin/commissions", label: "Commissions", icon: Percent },
  { href: "/admin/reversements", label: "Reversements", icon: Banknote },
  { href: "/admin/remboursements", label: "Remboursements", icon: Undo2 },
  { href: "/admin/accueil", label: "Accueil du site", icon: House },
  { href: "/admin/aide", label: "Centre d'aide", icon: LifeBuoy },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/virements", label: "Virements", icon: Landmark },
  { href: "/admin/encaissements", label: "En ligne / sur place", icon: Wallet },
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
                  active ? "bg-brand-900 text-white" : "text-ink/80 hover:bg-white hover:text-ink"
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
