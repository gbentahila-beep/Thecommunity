import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Card, PageHeader } from "@/components/admin/ui";
import { KindLegend, WeekChip } from "@/components/admin/week";
import { dayKey, dayLabel, weekOf, weekRows } from "@/lib/admin-week";
import { getAdminData } from "@/lib/data/admin";
import { getRendezvousTitles } from "@/lib/data/admin-todo";

export const metadata = { title: "Calendrier" };

/**
 * Refonte UX du 25/11 : le calendrier, une semaine à la fois (du lundi au dimanche), comme on la vit. Une colonne par
 * jour sur grand écran, une liste sur téléphone. Les gammes d'un rendez-vous sont réunies ; un point signale ce qu'il
 * reste à faire. Chaque date s'ouvre sur sa page, où tout se traite.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/admin/programme">) {
  await connection();
  const sp = await searchParams;
  const offset = Math.max(-12, Math.min(12, Number.parseInt(String(sp.semaine ?? "0"), 10) || 0));
  const [d, rvTitles] = await Promise.all([getAdminData(), getRendezvousTitles()]);
  const { days } = weekOf(d.now, offset);
  const inWeek = [...d.recentSessions, ...d.sessions].filter((s) => days.includes(dayKey(s.startAt))).filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
  const rows = weekRows(d, inWeek, rvTitles);
  const today = dayKey(d.now);
  const first = days[0]!;
  const last = days[6]!;
  const title = offset === 0 ? "Cette semaine" : offset === 1 ? "Semaine prochaine" : offset === -1 ? "Semaine dernière" : `Semaine du ${dayLabel(first, { day: "numeric", month: "long" })}`;
  const range = `du ${dayLabel(first, { weekday: "long", day: "numeric", month: "long" })} au ${dayLabel(last, { weekday: "long", day: "numeric", month: "long" })}`;
  const total = [...rows.values()].reduce((n, r) => n + r.length, 0);
  const href = (o: number) => (o === 0 ? "/admin/programme" : `/admin/programme?semaine=${o}`);

  return (
    <>
      <PageHeader
        title="Calendrier"
        subtitle="Toutes les dates, semaine par semaine. Cliquez sur une date pour tout gérer au même endroit."
        actions={<Link href="/admin/experiences/nouvelle" className="rounded-full bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800">+ Nouvel événement</Link>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2" data-testid="week-nav">
          <Link href={href(offset - 1)} aria-label="Semaine précédente" className="grid size-10 place-items-center rounded-full border border-line bg-white hover:border-brand-700"><ChevronLeft className="size-5" aria-hidden /></Link>
          <Link href={href(offset + 1)} aria-label="Semaine suivante" className="grid size-10 place-items-center rounded-full border border-line bg-white hover:border-brand-700"><ChevronRight className="size-5" aria-hidden /></Link>
          <div className="ms-1">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="text-xs text-muted">{range} · {total} date{total > 1 ? "s" : ""}</p>
          </div>
          {offset !== 0 && <Link href={href(0)} className="ms-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm font-medium text-brand-900 hover:border-brand-700">Aujourd&apos;hui</Link>}
        </div>
        <KindLegend />
      </div>

      <div className="grid gap-3 lg:grid-cols-7" data-testid="programme">
        {days.map((k) => {
          const dayRows = rows.get(k) ?? [];
          const isToday = k === today;
          const past = k < today;
          return (
            <section key={k} className={`rounded-2xl p-2 ${dayRows.length === 0 && !isToday ? "max-lg:hidden" : ""} ${isToday ? "bg-brand-50 ring-2 ring-brand-700" : "bg-white/60"} ${past ? "opacity-70" : ""}`}>
              <h3 className="mb-2 flex items-baseline justify-between gap-2 px-1 lg:flex-col lg:items-start lg:gap-0">
                <span className="text-sm font-semibold capitalize text-ink">{dayLabel(k, { weekday: "long" })}{isToday ? <span className="ms-1.5 rounded-full bg-brand-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Aujourd&apos;hui</span> : null}</span>
                <span className={`text-xs tabular-nums ${isToday ? "font-bold text-brand-900" : "text-muted"}`}>{dayLabel(k, { day: "numeric", month: "long" })}</span>
              </h3>
              {dayRows.length === 0 ? (
                <p className="px-1 py-3 text-xs text-muted">—</p>
              ) : (
                <div className="space-y-2">{dayRows.map((r) => <WeekChip key={r.key} row={r} />)}</div>
              )}
            </section>
          );
        })}
      </div>

      <Card className="mt-6" title="Rechercher">
        <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/admin/reservations" className="text-brand-900 underline">Une réservation</Link>
          <Link href="/admin/participations" className="text-brand-900 underline">Les demandes de participation</Link>
          <Link href="/admin/attribution" className="text-brand-900 underline">Les lieux de toutes les dates</Link>
        </p>
      </Card>
    </>
  );
}
