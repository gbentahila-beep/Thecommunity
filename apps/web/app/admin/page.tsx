import { seatsAvailable } from "@thecommunity/shared";
import { AlertTriangle, Clock, Inbox } from "lucide-react";
import Link from "next/link";
import { adminDate, BarList, Card, dh, FillBar, PageHeader, pct, StatTile, Table } from "@/components/admin/ui";
import { computeStats, getAdminData } from "@/lib/data/admin";
import { countPendingRequests } from "@/lib/data/admin-requests";
import { getSiteHealth } from "@/lib/data/admin-mail";
import { SiteHealthCard } from "@/components/admin/site-health";

export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboard() {
  const [d, pendingRequests, health] = await Promise.all([getAdminData(), countPendingRequests(), getSiteHealth()]);
  const s = computeStats(d);
  const upcoming = d.sessions.slice(0, 8);
  const weekEnd = d.now.getTime() + 7 * 86_400_000;
  const thisWeek = d.sessions.filter((x) => new Date(x.startAt).getTime() < weekEnd);
  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Casablanca · sessions des 3 prochaines semaines · mis à jour ${adminDate(d.now.toISOString())}`}
        actions={
          <Link href="/admin/experiences/nouvelle" className="rounded-full bg-plum-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-plum-800">
            + Nouvelle expérience
          </Link>
        }
      />
      {pendingRequests > 0 && (
        <Link href="/admin/participations" className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 hover:bg-amber-100">
          <Inbox className="size-5 shrink-0" aria-hidden />
          {pendingRequests} demande{pendingRequests > 1 ? "s" : ""} de participation à traiter →
        </Link>
      )}
      {health && <SiteHealthCard health={health} />}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Chiffre d'affaires brut" value={dh(s.gross)} hint={`${s.bookings} réservations confirmées`} />
        <StatTile label="Marge estimée" value={dh(s.margin)} hint={`${pct(s.gross ? s.margin / s.gross : 0)} du CA`} />
        <StatTile label="Taux de remplissage" value={pct(s.fill)} hint={`${s.seatsSold} places vendues`} />
        <StatTile label="Sessions cette semaine" value={String(thisWeek.length)} hint={`${s.soldOut} complètes au total`} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card title="Prochaines sessions" actions={<Link href="/admin/sessions" className="text-sm font-medium text-plum-900">Tout voir →</Link>}>
          <Table head={["Date", "Expérience", "Remplissage", "Attente", ""]} caption="Prochaines sessions">
            {upcoming.map((x) => {
              const e = d.experiences.get(x.experienceId)!;
              return (
                <tr key={x.id}>
                  <td className="whitespace-nowrap text-muted">{adminDate(x.startAt)}</td>
                  <td className="font-medium text-ink">{e.title.fr}</td>
                  <td><FillBar value={x.seatsConfirmed} max={x.capacity} /></td>
                  <td className="tabular-nums">{x.waitlistCount || "—"}</td>
                  <td className="text-end"><Link href={`/admin/sessions/${x.id}`} className="font-medium text-plum-900">Ouvrir</Link></td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <div className="space-y-6">
          <Card title={`Alertes (${s.alerts.length})`}>
            {s.alerts.length === 0 ? (
              <p className="text-sm text-muted">Rien à signaler.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {s.alerts.slice(0, 6).map((a) =>
                  a.kind === "low_fill" ? (
                    <li key={a.sessionId} className="flex gap-2.5">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                      <span>
                        <span className="font-semibold">Remplissage faible</span> — {d.experiences.get(d.sessions.find((x) => x.id === a.sessionId)!.experienceId)!.title.fr},{" "}
                        <Link className="text-plum-900 underline" href={`/admin/sessions/${a.sessionId}`}>{adminDate(d.sessions.find((x) => x.id === a.sessionId)!.startAt)}</Link>
                        {" "}({seatsAvailable(d.sessions.find((x) => x.id === a.sessionId)!)} places libres)
                      </span>
                    </li>
                  ) : (
                    <li key={a.reservationId} className="flex gap-2.5">
                      <Clock className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                      <span>
                        <span className="font-semibold">Paiement en attente</span> — réservation{" "}
                        <Link className="whitespace-nowrap text-plum-900 underline" href={`/admin/reservations?q=${a.reservationId}`}>{a.reservationId}</Link>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
            {s.alerts.length > 6 && <p className="mt-3 text-xs text-muted">+ {s.alerts.length - 6} autre{s.alerts.length - 6 > 1 ? "s" : ""} (voir Réservations et Sessions)</p>}
          </Card>
          <Card title="Chiffre d'affaires par univers">
            <BarList items={s.byCategory.map((c) => ({ label: c.name, value: c.gross, hint: `${c.bookings} réservations` }))} format={dh} />
          </Card>
        </div>
      </div>
    </>
  );
}
