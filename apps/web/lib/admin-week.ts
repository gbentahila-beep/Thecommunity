import type { AdminData } from "@/lib/data/admin";
import { sessionTodos, type SessionTodo } from "@/lib/admin-todos";

/**
 * Refonte UX du 25/11 : la semaine du back-office (accueil et calendrier). Les gammes d'un même rendez-vous à la même
 * heure sont réunies sur une seule ligne ; chaque ligne dit ce qu'il reste à faire (rouge, orange) ou qu'elle est prête.
 */
const TZ = "Africa/Casablanca";
const TIER = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" } as const;
const TIER_ORDER = ["casual", "premium", "exclusive"];

export const dayKey = (iso: string | Date) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
export const hhmm = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(":", "h");
export const dayLabel = (key: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts }).format(new Date(`${key}T12:00:00Z`));

export type WeekItem = { id: string; label: string; booked: number; capacity: number; waitlist: number };
export type WeekRow = {
  key: string; time: string; title: string; kind: "table" | "samedi" | "event"; items: WeekItem[];
  todos: SessionTodo[]; level: "red" | "amber" | "ok"; href: string;
};
export type WeekDay = { key: string; rows: WeekRow[] };

type S = AdminData["sessions"][number];

/** Lignes par jour pour des dates données (hors brouillons et annulées). */
export function weekRows(d: AdminData, sessions: S[], rvTitles: Map<string, string>, extra?: (s: S) => SessionTodo[]): Map<string, WeekRow[]> {
  const days = new Map<string, Map<string, WeekRow>>();
  for (const s of [...sessions].filter((x) => x.status !== "draft" && x.status !== "cancelled").sort((a, b) => a.startAt.localeCompare(b.startAt))) {
    const e = d.experiences.get(s.experienceId);
    if (!e) continue;
    const k = dayKey(s.startAt);
    if (!days.has(k)) days.set(k, new Map());
    const x = e as { rendezvousId?: string | null; rendezvousKind?: string | null };
    const rvId = x.rendezvousId ?? null;
    const rotation = x.rendezvousKind === "rotation";
    const rowKey = `${rotation ? e.id : rvId ?? e.id}|${s.startAt}`;
    const rows = days.get(k)!;
    if (!rows.has(rowKey)) {
      rows.set(rowKey, {
        key: rowKey, time: hhmm(s.startAt),
        // Activité du samedi : le nom de l'activité ; rendez-vous : son nom ; événement : son titre.
        title: rotation ? e.title.fr : (rvId && rvTitles.get(rvId)) || e.title.fr,
        kind: rotation ? "samedi" : rvId || e.categoryId === "eat" ? "table" : "event",
        items: [], todos: [], level: "ok", href: `/admin/sessions/${s.id}`,
      });
    }
    const row = rows.get(rowKey)!;
    row.items.push({ id: s.id, label: e.venueTier ? TIER[e.venueTier as keyof typeof TIER] ?? e.venueTier : "", booked: s.seatsConfirmed, capacity: s.capacity, waitlist: s.waitlistCount ?? 0 });
    row.items.sort((a, b) => TIER_ORDER.indexOf(a.label.toLowerCase()) - TIER_ORDER.indexOf(b.label.toLowerCase()));
    row.todos.push(...sessionTodos(d, s).filter((t) => t.tone === "red" || t.tone === "amber"), ...(extra?.(s) ?? []));
  }
  const out = new Map<string, WeekRow[]>();
  for (const [k, rows] of days) {
    out.set(k, [...rows.values()].map((r) => {
      const todos = [...new Map(r.todos.map((t) => [t.text, t])).values()];
      return { ...r, todos, level: todos.some((t) => t.tone === "red") ? "red" : todos.length ? "amber" : "ok" };
    }));
  }
  return out;
}

/** Lundi (AAAA-MM-JJ, heure du Maroc) de la semaine de `now` décalée de `offset` semaines, et ses 7 jours. */
export function weekOf(now: Date, offset: number): { monday: string; days: string[] } {
  const today = new Date(`${dayKey(now)}T12:00:00Z`);
  const dow = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today.getTime() - dow * 86_400_000 + offset * 7 * 86_400_000);
  const days = Array.from({ length: 7 }, (_, i) => new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  return { monday: days[0]!, days };
}
