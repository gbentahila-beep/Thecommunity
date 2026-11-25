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
    <section aria-label="L'essentiel" className="border-t border-line pt-8" data-testid="meeting">
      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, value, link }) => (
          <li key={label} className="flex items-start gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-brand-900">
              <Icon className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block font-medium text-ink">{label}</span>
              {value && <span className="text-sm text-muted">{value}</span>}
              {link && <Link href={link.href} className="mt-0.5 block text-xs font-semibold text-brand-900 underline underline-offset-2">{link.label}</Link>}
            </span>
          </li>
        ))}
      </ul>
      {children}
    </section>
  );
}
