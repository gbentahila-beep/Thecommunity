import { AlertTriangle, CheckCircle2, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";
import { SiteHealthCard } from "@/components/admin/site-health";
import { adminDate, Badge, Card, dh, PageHeader, pct, StatTile } from "@/components/admin/ui";
import { sessionTitle, sessionTodos } from "@/lib/admin-todos";
import { computeStats, getAdminData } from "@/lib/data/admin";
import { getSiteHealth } from "@/lib/data/admin-mail";
import { getAdminTodo, getRendezvousTitles } from "@/lib/data/admin-todo";

export const metadata = { title: "À faire" };

const HOUR = 3_600_000;

/**
 * Back-office simplifié (24/11) : une seule page d'accueil. En haut, tout ce qui attend une action de l'équipe ; puis
 * les dates des 7 prochains jours avec ce qu'il reste à faire pour chacune (un clic ouvre la page de la date, où tout
 * se traite) ; enfin quelques chiffres.
 */
export default async function AdminTodoPage() {
  const [d, todo, health, rvTitles] = await Promise.all([getAdminData(), getAdminTodo(), getSiteHealth(), getRendezvousTitles()]);
  const now = d.now.getTime();
  const stats = computeStats(d);
  const week = [...d.recentSessions, ...d.sessions]
    .filter((s) => s.status !== "cancelled" && new Date(s.startAt).getTime() > now - 3 * HOUR && new Date(s.startAt).getTime() < now + 7 * 24 * HOUR)
    .filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i)
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .map((s) => ({ s, todos: sessionTodos(d, s).filter((t) => t.tone === "red" || t.tone === "amber"), requests: todo.requestsBySession.get(s.id) ?? 0, reports: todo.reportsBySession.get(s.id) ?? 0 }));
  const urgent = week.filter((w) => w.todos.some((t) => t.tone === "red") || w.reports > 0).length;
  return (
    <>
      <PageHeader
        title="À faire"
        subtitle={`${todo.items.reduce((n, x) => n + x.count, 0)} élément(s) en attente · ${week.length} date(s) dans les 7 prochains jours${urgent ? ` · ${urgent} urgente(s)` : ""}`}
        actions={<Link href="/admin/experiences/nouvelle" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvel événement</Link>}
      />
      {health && <SiteHealthCard health={health} />}

      <Card title="À traiter" className="mb-6">
        {todo.items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-800" data-testid="todo-empty"><CheckCircle2 className="size-4" aria-hidden /> Rien en attente.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="todo-list">
            {todo.items.map((x) => (
              <li key={x.key}>
                <Link href={x.href} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-900">
                  {x.tone === "red" ? <AlertTriangle className="size-4 shrink-0 text-red-700" aria-hidden /> : <Inbox className="size-4 shrink-0 text-amber-700" aria-hidden />}
                  <span className="flex-1"><strong className="tabular-nums">{x.count}</strong> {x.label}</span>
                  <ChevronRight className="size-4 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Les 7 prochains jours" actions={<Link href="/admin/programme" className="text-sm font-medium text-brand-900">Tout le programme →</Link>} className="mb-6">
        {week.length === 0 ? (
          <p className="text-sm text-muted">Aucune date dans les 7 prochains jours.</p>
        ) : (
          <ul className="divide-y divide-line" data-testid="today-list">
            {week.map(({ s, todos, requests, reports }) => (
              <li key={s.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-48 flex-1">
                  <Link href={`/admin/sessions/${s.id}`} className="font-semibold text-ink hover:text-brand-900">{sessionTitle(d, s, rvTitles)}</Link>
                  <p className="text-sm text-muted">{adminDate(s.startAt)} · {s.seatsConfirmed} / {s.capacity} places{s.waitlistCount ? ` · ${s.waitlistCount} en attente` : ""}</p>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {reports > 0 && <li><Link href={`/admin/sessions/${s.id}#signalements`}><Badge tone="red">{reports} signalement(s)</Badge></Link></li>}
                  {requests > 0 && <li><Link href={`/admin/sessions/${s.id}#demandes`}><Badge tone="amber">{requests} demande(s) à traiter</Badge></Link></li>}
                  {todos.length === 0 && !requests && !reports ? <li><Badge tone="green">Rien à faire</Badge></li> : todos.map((t) => <li key={t.text}><Link href={`/admin/sessions/${s.id}${t.anchor ? `#${t.anchor}` : ""}`}><Badge tone={t.tone}>{t.text}</Badge></Link></li>)}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Chiffre d'affaires brut" value={dh(stats.gross)} hint={`${stats.bookings} réservations confirmées`} />
        <StatTile label="Participants" value={String(stats.people)} hint={`${pct(stats.returningRate)} reviennent`} />
        <StatTile label="Taux de remplissage" value={pct(stats.fill)} hint={`${stats.seatsSold} places vendues`} />
        <StatTile label="Dates complètes" value={String(stats.soldOut)} hint={<Link href="/admin/statistiques" className="text-brand-900 underline">Statistiques détaillées</Link>} />
      </div>
    </>
  );
}
