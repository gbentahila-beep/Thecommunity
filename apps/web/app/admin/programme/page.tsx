import { connection } from "next/server";
import Link from "next/link";
import { Badge, Card, FillBar, PageHeader } from "@/components/admin/ui";
import { sessionTodos } from "@/lib/admin-todos";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminData } from "@/lib/data/admin";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Programme" };

const TZ = "Africa/Casablanca";
const dayKey = (iso: string) => new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
const hhmm = (iso: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)).replace(":", "h");
const TIER = { casual: "Casual", premium: "Premium", exclusive: "Exclusive" } as const;

/**
 * Back-office simplifié (24/11) : le programme, jour par jour. Les gammes d'un même rendez-vous sont réunies sur une
 * ligne ; chaque date s'ouvre sur sa page, où tout se traite (lieux, tables, participants, demandes, signalements).
 */
export default async function ProgrammePage({ searchParams }: PageProps<"/admin/programme">) {
  await connection();
  const sp = await searchParams;
  const past = sp.vue === "passees";
  const d = await getAdminData();
  const rvTitles = new Map<string, string>();
  if (FIREBASE_ENABLED) {
    await requireAdmin();
    (await adminDb().collection("rendezvous").get()).docs.forEach((x) => rvTitles.set(x.id, String(x.get("title.fr") ?? "")));
  }
  const now = d.now.getTime();
  const list = (past ? d.recentSessions : d.sessions.filter((s) => new Date(s.endAt ?? s.startAt).getTime() >= now - 3 * 3_600_000))
    .filter((s) => s.status !== "draft")
    .sort((a, b) => (past ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));

  // Une ligne par (jour, rendez-vous ou événement, heure) ; les gammes d'un rendez-vous dans la même ligne.
  type Row = { key: string; time: string; title: string; rv: boolean; items: { id: string; label: string; booked: number; capacity: number; waitlist: number; cancelled: boolean }[]; todos: ReturnType<typeof sessionTodos> };
  const days = new Map<string, { label: string; rows: Map<string, Row> }>();
  for (const s of list) {
    const e = d.experiences.get(s.experienceId);
    if (!e) continue;
    const k = dayKey(s.startAt);
    if (!days.has(k)) days.set(k, { label: dayLabel(s.startAt), rows: new Map() });
    const rvId = (e as { rendezvousId?: string | null }).rendezvousId ?? null;
    const rowKey = `${rvId ?? e.id}|${s.startAt}`;
    const rows = days.get(k)!.rows;
    if (!rows.has(rowKey)) rows.set(rowKey, { key: rowKey, time: hhmm(s.startAt), title: (rvId && rvTitles.get(rvId)) || e.title.fr, rv: Boolean(rvId), items: [], todos: [] });
    const row = rows.get(rowKey)!;
    row.items.push({ id: s.id, label: e.venueTier ? TIER[e.venueTier as keyof typeof TIER] ?? e.venueTier : rvId ? e.title.fr : "Ouvrir", booked: s.seatsConfirmed, capacity: s.capacity, waitlist: s.waitlistCount ?? 0, cancelled: s.status === "cancelled" });
    row.todos.push(...sessionTodos(d, s).filter((t) => t.tone === "red" || t.tone === "amber"));
  }

  return (
    <>
      <PageHeader
        title="Programme"
        subtitle={past ? "Dates des derniers jours (pointage, avis, absences)." : "Toutes les dates à venir. Ouvrez une date pour tout gérer au même endroit."}
        actions={
          <>
            <Link href="/admin/rendez-vous" className="rounded-full border border-brand-900 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-brand-50">Rendez-vous de la semaine</Link>
            <Link href="/admin/experiences/nouvelle" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvel événement</Link>
          </>
        }
      />
      <nav aria-label="Vue" className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href="/admin/programme" aria-current={!past ? "page" : undefined} className={!past ? "font-semibold text-ink" : "text-brand-900 underline"}>À venir</Link>
        <Link href="/admin/programme?vue=passees" aria-current={past ? "page" : undefined} className={past ? "font-semibold text-ink" : "text-brand-900 underline"}>Derniers jours</Link>
        <span className="text-muted">·</span>
        <span className="text-muted">Rechercher :</span>
        <Link href="/admin/reservations" className="text-brand-900 underline">une réservation</Link>
        <Link href="/admin/participations" className="text-brand-900 underline">les demandes de participation</Link>
        <Link href="/admin/attribution" className="text-brand-900 underline">les lieux de toutes les dates</Link>
      </nav>
      {days.size === 0 ? (
        <Card><p className="text-sm text-muted">Aucune date.</p></Card>
      ) : (
        <div className="space-y-5" data-testid="programme">
          {[...days.entries()].map(([k, day]) => (
            <Card key={k} title={day.label.charAt(0).toUpperCase() + day.label.slice(1)}>
              <ul className="divide-y divide-line">
                {[...day.rows.values()].map((row) => (
                  <li key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                    <span className="w-14 font-semibold tabular-nums text-ink">{row.time}</span>
                    <span className="min-w-44 flex-1">
                      <span className="font-semibold text-ink">{row.title}</span>
                      {row.rv && <span className="ms-2 text-xs text-muted">rendez-vous</span>}
                      {row.todos.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {[...new Map(row.todos.map((t) => [t.text, t])).values()].slice(0, 3).map((t) => <Badge key={t.text} tone={t.tone}>{t.text}</Badge>)}
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {row.items.map((it) => (
                        <Link key={it.id} href={`/admin/sessions/${it.id}`} className="flex min-w-40 items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm hover:border-brand-700" data-testid="programme-date">
                          <span className="font-medium text-ink">{it.label}</span>
                          {it.cancelled ? <Badge tone="red">Annulée</Badge> : <FillBar value={it.booked} max={it.capacity} />}
                          {it.waitlist > 0 && <span className="text-xs text-muted">+{it.waitlist}</span>}
                        </Link>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
