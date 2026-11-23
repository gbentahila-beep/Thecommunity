import type { LucideIcon } from "lucide-react";

export type EssentialItem = { icon: LucideIcon; label: string; value?: string };

/**
 * L'essentiel d'un événement, en un seul encadré (étape P) : quand, où, en quel format, combien de temps, niveau,
 * langues, âge visé, public. Chaque information une seule fois ; plus de phrases d'explication répétées.
 * Les chiffres sur les inscrits n'apparaissent qu'à partir de 4 personnes (âge arrondi, intérêts partagés seulement).
 */
export function EventEssentials({ items, crowd, children }: { items: EssentialItem[]; crowd?: string; children?: React.ReactNode }) {
  return (
    <section aria-label="L'essentiel" className="rounded-[var(--radius-card)] bg-white p-5 shadow-card" data-testid="meeting">
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, value }) => (
          <li key={label} className="flex items-start gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
            <span>
              <span className="block font-medium text-ink">{label}</span>
              {value && <span className="text-sm text-muted">{value}</span>}
            </span>
          </li>
        ))}
      </ul>
      {crowd && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink/85" data-testid="meeting-crowd">
          {crowd}
        </p>
      )}
      {children}
    </section>
  );
}
