import { AlertTriangle, CheckCircle2, CircleDot } from "lucide-react";
import Link from "next/link";
import type { WeekRow } from "@/lib/admin-week";
import { Badge } from "./ui";

/**
 * Refonte UX du 25/11 : une date du back-office, en ligne (accueil) ou en pastille (calendrier). Une couleur par
 * univers (Tables, activité du samedi, événement) et un état lisible d'un coup d'œil : prêt, à surveiller, urgent.
 */
export const KIND = {
  table: { label: "Table", bar: "border-s-brand-700", dot: "bg-brand-700" },
  samedi: { label: "Activité du samedi", bar: "border-s-emerald-600", dot: "bg-emerald-600" },
  event: { label: "Événement", bar: "border-s-amber-500", dot: "bg-amber-500" },
} as const;

export function KindLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Légende">
      {Object.values(KIND).map((k) => (
        <li key={k.label} className="flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${k.dot}`} aria-hidden />{k.label}</li>
      ))}
    </ul>
  );
}

function Fill({ booked, capacity }: { booked: number; capacity: number }) {
  const ratio = capacity ? Math.min(1, booked / capacity) : 0;
  return (
    <span className="flex items-center gap-1.5" title={`${booked} inscrit(s) sur ${capacity}`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-cream-deep" aria-hidden><span className="block h-full rounded-full bg-brand-700" style={{ width: `${ratio * 100}%` }} /></span>
      <span className="tabular-nums text-xs text-muted">{booked}/{capacity}</span>
    </span>
  );
}

export function StatusTag({ row }: { row: WeekRow }) {
  if (row.level === "ok") return <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800"><CheckCircle2 className="size-3.5" aria-hidden />Prêt</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${row.level === "red" ? "text-red-800" : "text-amber-800"}`}>
      {row.level === "red" ? <AlertTriangle className="size-3.5" aria-hidden /> : <CircleDot className="size-3.5" aria-hidden />}
      {row.todos.length} à faire
    </span>
  );
}

/** Ligne (accueil) : heure, nom, gammes avec remplissage, ce qu'il reste à faire. */
export function WeekRowLine({ row }: { row: WeekRow }) {
  return (
    <li className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-s-4 py-3 ps-3 ${KIND[row.kind].bar}`} data-testid="week-row">
      <span className="w-12 font-semibold tabular-nums text-ink">{row.time}</span>
      <span className="min-w-40 flex-1">
        <Link href={row.href} className="font-semibold text-ink hover:text-brand-900">{row.title}</Link>
        {row.todos.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {row.todos.slice(0, 3).map((t) => <Link key={t.text} href={`${row.href}${t.anchor ? `#${t.anchor}` : ""}`}><Badge tone={t.tone}>{t.text}</Badge></Link>)}
          </span>
        )}
      </span>
      <span className="flex flex-wrap gap-2">
        {row.items.map((it) => (
          <Link key={it.id} href={`/admin/sessions/${it.id}`} className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm hover:border-brand-700">
            {it.label && <span className="font-medium text-ink">{it.label}</span>}
            <Fill booked={it.booked} capacity={it.capacity} />
          </Link>
        ))}
      </span>
      <span className="w-20 text-end"><StatusTag row={row} /></span>
    </li>
  );
}

/** Pastille (calendrier) : tout tient dans une colonne de jour. */
export function WeekChip({ row }: { row: WeekRow }) {
  return (
    <div className={`rounded-xl border border-line border-s-4 bg-white p-2.5 text-sm shadow-sm ${KIND[row.kind].bar}`} data-testid="programme-row">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold tabular-nums text-ink">{row.time}</span>
        {row.level !== "ok" && <span className={`mt-1 size-2 shrink-0 rounded-full ${row.level === "red" ? "bg-red-600" : "bg-amber-500"}`} title={row.todos.map((t) => t.text).join(" · ")} />}
      </div>
      <Link href={row.href} className="mt-0.5 block font-medium leading-snug text-ink hover:text-brand-900">{row.title}</Link>
      <ul className="mt-1.5 space-y-1">
        {row.items.map((it) => (
          <li key={it.id}>
            <Link href={`/admin/sessions/${it.id}`} className="flex items-center justify-between gap-2 rounded-md px-1 py-0.5 hover:bg-cream" data-testid="programme-date">
              <span className="truncate text-xs text-ink/80">{it.label || "Inscrits"}</span>
              <span className="tabular-nums text-xs text-muted">{it.booked}/{it.capacity}{it.waitlist ? ` +${it.waitlist}` : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
      {row.todos.length > 0 && <p className={`mt-1.5 text-xs font-medium ${row.level === "red" ? "text-red-800" : "text-amber-800"}`}>{row.todos[0]!.text}{row.todos.length > 1 ? ` (+${row.todos.length - 1})` : ""}</p>}
    </div>
  );
}
