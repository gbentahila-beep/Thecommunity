import { AlertTriangle, BookOpen, CalendarDays, CalendarPlus, CheckCircle2, ChevronRight, Inbox, Repeat, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { SiteHealthCard } from "@/components/admin/site-health";
import { Card, dh, pct, StatTile } from "@/components/admin/ui";
import { KindLegend, WeekRowLine } from "@/components/admin/week";
import { dayKey, dayLabel, weekRows } from "@/lib/admin-week";
import { computeStats, getAdminData } from "@/lib/data/admin";
import { getSiteHealth } from "@/lib/data/admin-mail";
import { getAdminTodo, getRendezvousTitles } from "@/lib/data/admin-todo";
import { adminDb } from "@/lib/firebase/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Accueil" };

const HOUR = 3_600_000;

const SHORTCUTS = [
  { href: "/admin/experiences/nouvelle", label: "Créer un événement", hint: "Soirée, édition spéciale, nouvelle activité…", icon: CalendarPlus },
  { href: "/admin/rendez-vous#samedis", label: "Planning des samedis", hint: "Choisir ou changer l'activité", icon: Repeat },
  { href: "/admin/programme", label: "Calendrier", hint: "Toutes les dates, semaine par semaine", icon: CalendarDays },
  { href: "/admin/guide", label: "Guide", hint: "Comment faire, pas à pas", icon: BookOpen },
] as const;

/**
 * Refonte UX du 25/11 : l'accueil répond à deux questions. « Qu'est-ce qui attend une action de ma part ? » (en haut,
 * en rouge ou orange) et « Qu'est-ce qui se passe ces 7 prochains jours ? » (jour par jour, une ligne par rendez-vous,
 * « Prêt » quand il n'y a rien à faire). Les raccourcis mènent aux tâches les plus fréquentes.
 */
export default async function AdminHomePage() {
  const [d, todo, health, rvTitles] = await Promise.all([getAdminData(), getAdminTodo(), getSiteHealth(), getRendezvousTitles()]);
  const now = d.now.getTime();
  const stats = computeStats(d);
  const upcoming = [...d.recentSessions, ...d.sessions]
    .filter((s) => new Date(s.startAt).getTime() > now - 3 * HOUR && new Date(s.startAt).getTime() < now + 7 * 24 * HOUR)
    .filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
  const extra = (s: (typeof upcoming)[number]) => [
    ...((todo.reportsBySession.get(s.id) ?? 0) > 0 ? [{ tone: "red" as const, text: `${todo.reportsBySession.get(s.id)} signalement(s)`, anchor: "signalements" }] : []),
    ...((todo.requestsBySession.get(s.id) ?? 0) > 0 ? [{ tone: "amber" as const, text: `${todo.requestsBySession.get(s.id)} demande(s) à traiter`, anchor: "demandes" }] : []),
  ];
  const days = [...weekRows(d, upcoming, rvTitles, extra).entries()].sort(([a], [b]) => a.localeCompare(b));
  const rows = days.flatMap(([, r]) => r);
  const urgent = rows.filter((r) => r.level === "red").length;
  const watch = rows.filter((r) => r.level === "amber").length;
  // « À traiter » réunit aussi ce que demandent les dates des 7 prochains jours (restaurants à appeler, date à risque…),
  // les plus urgentes d'abord ; chaque ligne mène à l'endroit de la date où le faire.
  const sessionItems = rows
    .flatMap((r) => r.todos.filter((t) => t.tone === "red" || t.tone === "amber").map((t) => ({
      key: `${t.sessionId}|${t.text}`,
      tone: t.tone as "red" | "amber",
      label: `${r.title}${t.tier ? ` ${t.tier}` : ""} (${t.startAt ? dayLabel(dayKey(t.startAt), { weekday: "short", day: "numeric" }) : ""} ${r.time}) : ${t.text.charAt(0).toLowerCase()}${t.text.slice(1)}`,
      href: `/admin/sessions/${t.sessionId ?? r.items[0]!.id}${t.anchor ? `#${t.anchor}` : ""}`,
    })))
    .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "red" ? -1 : 1));
  const allItems = [...sessionItems.map((x) => ({ ...x, count: 0 })), ...todo.items];
  const pending = todo.items.reduce((n, x) => n + x.count, 0) + sessionItems.length;
  const today = dayKey(d.now);
  const tomorrow = dayKey(new Date(now + 24 * HOUR));
  const name = d.admin ? String(d.usersById.get(d.admin.uid)?.firstName ?? "") : "";
  // Site de démonstration : raccourci vers la remise à zéro (jamais en production).
  const show = FIREBASE_ENABLED && !d.isDemo ? await adminDb().doc("settings/showcase").get() : null;
  const trial = Boolean(show && (show.get("trial") === true || show.get("demoCrowdV1At") || (show.get("rendezvousLaunchAt") && show.get("purgeArchivedAt"))));
  const shortcuts = [...SHORTCUTS, ...(trial ? [{ href: "/admin/demo", label: "Réinitialiser la démo", hint: "Tout effacer et remplir la semaine", icon: RotateCcw }] : [])];

  return (
    <>
      <header className="mb-6">
        <p className="text-sm font-medium text-muted">{((x) => x.charAt(0).toUpperCase() + x.slice(1))(dayLabel(today, { weekday: "long", day: "numeric", month: "long" }))}</p>
        <h1 className="page-title text-start">Bonjour{name ? ` ${name}` : ""}</h1>
        <p className="mt-1 text-sm text-muted" data-testid="home-summary">
          {pending === 0 && urgent === 0 && watch === 0
            ? "Tout est en ordre : rien n'attend votre action."
            : [pending ? `${pending} élément${pending > 1 ? "s" : ""} à traiter` : "", urgent ? `${urgent} date${urgent > 1 ? "s" : ""} urgente${urgent > 1 ? "s" : ""}` : "", watch ? `${watch} date${watch > 1 ? "s" : ""} à surveiller` : ""].filter(Boolean).join(" · ")}
        </p>
      </header>
      {health && <SiteHealthCard health={health} />}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="À traiter" className="lg:col-span-2">
          {allItems.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" data-testid="todo-empty"><CheckCircle2 className="size-4" aria-hidden /> Rien en attente.</p>
          ) : (
            <ul className="divide-y divide-line" data-testid="todo-list">
              {allItems.map((x) => (
                <li key={x.key}>
                  <Link href={x.href} className="group flex items-center gap-3 py-3 text-sm">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-full ${x.tone === "red" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {x.tone === "red" ? <AlertTriangle className="size-4" aria-hidden /> : <Inbox className="size-4" aria-hidden />}
                    </span>
                    <span className="flex-1 text-ink group-hover:text-brand-900">{x.count > 0 && <strong className="tabular-nums">{x.count} </strong>}{x.label}</span>
                    <span className="text-xs font-semibold text-brand-900">Traiter</span>
                    <ChevronRight className="size-4 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Raccourcis">
          <ul className="grid gap-2" data-testid="shortcuts">
            {shortcuts.map((s) => (
              <li key={s.href}>
                <Link href={s.href} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:border-brand-700 hover:bg-brand-50">
                  <s.icon className="size-5 shrink-0 text-brand-900" aria-hidden />
                  <span><span className="block text-sm font-semibold text-ink">{s.label}</span><span className="block text-xs text-muted">{s.hint}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Les 7 prochains jours" actions={<Link href="/admin/programme" className="text-sm font-medium text-brand-900">Ouvrir le calendrier →</Link>} className="mb-6">
        <div className="mb-3"><KindLegend /></div>
        {days.length === 0 ? (
          <p className="text-sm text-muted">Aucune date dans les 7 prochains jours.</p>
        ) : (
          <div className="space-y-5" data-testid="today-list">
            {days.map(([k, dayRows]) => (
              <section key={k}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {k === today ? "Aujourd'hui" : k === tomorrow ? "Demain" : dayLabel(k)}
                  {k === today || k === tomorrow ? <span className="ms-1 font-normal normal-case">· {dayLabel(k, { weekday: "long", day: "numeric", month: "long" })}</span> : null}
                </h3>
                <ul className="divide-y divide-line">{dayRows.map((r) => <WeekRowLine key={r.key} row={r} />)}</ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Chiffre d'affaires brut" value={dh(stats.gross)} hint={`${stats.bookings} réservations confirmées`} />
        <StatTile label="Participants" value={String(stats.people)} hint={`${pct(stats.returningRate)} reviennent`} />
        <StatTile label="Taux de remplissage" value={pct(stats.fill)} hint={`${stats.seatsSold} places vendues`} />
        <StatTile label="Dates complètes" value={String(stats.soldOut)} hint={<Link href="/admin/statistiques" className="text-brand-900 underline">Statistiques détaillées</Link>} />
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted"><Sparkles className="size-3.5" aria-hidden /> Besoin d&apos;aide ? Le <Link href="/admin/guide" className="underline">guide</Link> explique chaque tâche pas à pas.</p>
    </>
  );
}
