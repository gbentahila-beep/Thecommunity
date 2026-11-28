import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";

export type EssentialItem = { icon: LucideIcon; label: string; value?: string; link?: { href: string; label: string } };

/**
 * L'essentiel d'un événement, en un seul encadré (étape P) : quand, où, en quel format, combien de temps, niveau,
 * langues, âge visé, public. Chaque information une seule fois ; plus de phrases d'explication répétées.
 * Aucun aperçu des inscrits (nombre, âges, centres d'intérêt) avant de réserver (26/11).
 */
export function EventEssentials({ items, children }: { items: EssentialItem[]; children?: React.ReactNode }) {
  return (
    // Étape 4 (docs/29) : l'essentiel sans encadré, en grille aérée sous un filet, une icône dans un rond par ligne.
    <section aria-label="L'essentiel" className="rounded-3xl bg-white p-5 ring-1 ring-line/70 sm:p-6" data-testid="meeting">
      {/* Deux colonnes dès le téléphone (trois sur ordinateur) : l'essentiel tient en un coup d'œil. */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-6 lg:grid-cols-3">
        {items.map(({ icon: Icon, label, value, link }) => (
          <li key={label} className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
            <span className="bub-peach grid size-10 shrink-0 place-items-center rounded-full text-ink">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-snug font-semibold text-ink">{label}</span>
              {value && <span className="block text-[13px] leading-snug text-muted">{value}</span>}
              {link && <Link href={link.href} className="mt-0.5 block text-xs font-semibold text-brand-900 underline underline-offset-2">{link.label}</Link>}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
