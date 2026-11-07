import { formatMoney } from "@thecommunity/shared";
import type { ReactNode } from "react";

export const dh = (amount: number) => formatMoney({ amount, currency: "MAD" });
export const pct = (v: number) => `${Math.round(v * 100)} %`;

export const adminDate = (iso: string, withTime = true) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    weekday: withTime ? "short" : undefined,
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : { year: "numeric" }),
  }).format(new Date(iso));

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-medium text-plum-900 sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-4 shadow-card sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Tableau défilant horizontalement sur mobile. */
export function Table({ head, children, caption }: { head: string[]; children: ReactNode; caption?: string }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-start text-xs uppercase tracking-wide text-muted">
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2.5 text-start font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70 [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

const TONES = {
  green: "bg-emerald-100 text-emerald-900",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-900",
  gray: "bg-stone-200 text-stone-700",
  plum: "bg-plum-100 text-plum-900",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

/** Jauge de remplissage : une seule teinte, valeur toujours écrite à côté. */
export function FillBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const ratio = max ? Math.min(1, value / max) : 0;
  return (
    <div className="flex items-center gap-2" title={label ?? `${value} / ${max}`}>
      <div className="h-2 w-24 overflow-hidden rounded-full bg-cream-deep" role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label ?? "Remplissage"}>
        <div className="h-full rounded-full bg-plum-700" style={{ width: `${ratio * 100}%` }} />
      </div>
      <span className="tabular-nums text-xs text-muted">{value}/{max}</span>
    </div>
  );
}

/** Barres horizontales d'une seule série : valeur écrite pour chaque barre (lecture sans couleur). */
export function BarList({ items, format }: { items: { label: string; value: number; hint?: string }[]; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} className="text-sm" title={`${i.label} : ${format(i.value)}${i.hint ? ` · ${i.hint}` : ""}`}>
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-ink/80">{i.label}</span>
            <span className="tabular-nums font-medium text-ink">{format(i.value)}</span>
          </span>
          {/* Piste commune pleine largeur : les longueurs sont comparables d'une barre à l'autre. */}
          <span className="mt-1.5 block h-2.5" aria-hidden>
            <span className="block h-full rounded-e-[4px] bg-plum-700" style={{ width: `${Math.max(1, (i.value / max) * 100)}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-plum-50 px-3 py-2 text-xs text-plum-900">{children}</p>;
}
