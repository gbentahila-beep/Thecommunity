"use client";

import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Handshake,
  Home,
  Repeat,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };
type NavLink = { href: string; label: string; icon: typeof Settings; exact?: boolean; tabs?: Tab[]; /** Pages rangées sous cette entrée (sans onglet). */ match?: string[] };

/**
 * Menu du back-office (refonte UX du 25/11), dans l'ordre où l'on s'en sert : l'accueil (ce qui attend une action),
 * le calendrier de la semaine, les rendez-vous qui reviennent chaque semaine (dîner, café, brunch, activité du
 * samedi), puis les fiches des événements. Tout ce qui concerne une date est sur la page de cette date.
 */
export const ADMIN_SECTIONS: { title: string | null; links: NavLink[] }[] = [
  {
    title: null,
    links: [
      { href: "/admin", label: "Accueil", icon: Home, exact: true, match: ["/admin/aujourdhui"] },
      { href: "/admin/programme", label: "Calendrier", icon: CalendarDays, match: ["/admin/sessions", "/admin/attribution", "/admin/reservations", "/admin/participations", "/admin/billets"] },
      { href: "/admin/rendez-vous", label: "Rendez-vous", icon: Repeat },
      { href: "/admin/experiences", label: "Événements", icon: Sparkles, match: ["/admin/modeles"] },
    ],
  },
  {
    title: "Personnes",
    links: [
      { href: "/admin/utilisateurs", label: "Membres", icon: Users, match: ["/admin/abonnement", "/admin/avis", "/admin/signalements"] },
      { href: "/admin/partenaires", label: "Partenaires", icon: Handshake, tabs: [{ href: "/admin/partenaires", label: "Lieux" }, { href: "/admin/organisateurs", label: "Organisateurs" }] },
    ],
  },
  {
    title: "Gestion",
    links: [
      { href: "/admin/paiements", label: "Argent", icon: CreditCard, tabs: [{ href: "/admin/paiements", label: "Paiements" }, { href: "/admin/remboursements", label: "Remboursements" }, { href: "/admin/virements", label: "Virements" }, { href: "/admin/promos", label: "Codes promo" }, { href: "/admin/statistiques", label: "Statistiques" }] },
      {
        href: "/admin/parametres",
        label: "Réglages",
        icon: Settings,
        tabs: [
          { href: "/admin/parametres", label: "Paramètres" },
          { href: "/admin/accueil", label: "Accueil du site" },
          { href: "/admin/aide", label: "Centre d'aide" },
          { href: "/admin/emails", label: "Boîte d'envoi" },
          { href: "/admin/demandes", label: "Demandes 09-08" },
          { href: "/admin/vitrine", label: "Vitrine" },
          { href: "/admin/demo", label: "Site de démo" },
        ],
      },
      { href: "/admin/guide", label: "Guide", icon: BookOpen },
    ],
  },
];

/** Toutes les entrées, à plat. */
export const ADMIN_LINKS = ADMIN_SECTIONS.flatMap((s) => s.links);

const under = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);
const isActive = (pathname: string, l: NavLink) => (l.exact ? pathname === l.href : under(pathname, l.href)) || (l.tabs ?? []).some((t) => under(pathname, t.href)) || (l.match ?? []).some((m) => under(pathname, m));

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Back-office" className="space-y-4">
      {ADMIN_SECTIONS.map((s, i) => (
        <div key={s.title ?? i}>
          {s.title && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{s.title}</p>}
          <ul className="space-y-0.5">
            {s.links.map((l) => {
              const active = isActive(pathname, l);
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      active ? "bg-brand-900 text-white" : "text-ink/80 hover:bg-white hover:text-ink"
                    }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Onglets des pages réunies sous une même entrée du menu (ex. Paiements : remboursements, virements, codes promo). */
export function AdminTabs() {
  const pathname = usePathname();
  const entry = ADMIN_LINKS.find((l) => l.tabs?.some((t) => under(pathname, t.href)));
  if (!entry?.tabs) return null;
  // L'onglet le plus précis gagne (/admin/experiences/… reste sur « Événements »).
  const current = [...entry.tabs].sort((a, b) => b.href.length - a.href.length).find((t) => under(pathname, t.href));
  return (
    <nav aria-label={entry.label} className="-mt-1 mb-5 overflow-x-auto print:hidden">
      <ul className="flex gap-1.5 whitespace-nowrap">
        {entry.tabs.map((t) => {
          const on = t.href === current?.href;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={on ? "page" : undefined} className={`inline-block rounded-full px-3.5 py-1.5 text-sm font-medium ${on ? "bg-brand-900 text-white" : "bg-white text-ink/80 shadow-card hover:text-ink"}`}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
