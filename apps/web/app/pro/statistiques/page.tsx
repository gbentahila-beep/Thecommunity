import { Card, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getProData, proStats, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Statistiques" };

/**
 * Statistiques de l'organisateur (docs/22 § 12) : « Finances » devient « Statistiques ». Les participants règlent le
 * prix de l'activité sur place, directement à l'organisateur ; Wenzy ne prend que ses frais (35 DH, payés par le
 * participant). Plus de reversements ni de commissions.
 */
export default async function ProStatsPage() {
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const s = proStats(d);
  const past = d.sessions.filter((x) => x.startAt < d.now.toISOString() && x.status !== "cancelled");
  const attended = d.reservations.filter((r) => r.status === "attended").reduce((n, r) => n + r.seats, 0);
  const noShow = d.reservations.filter((r) => r.status === "no_show").reduce((n, r) => n + r.seats, 0);
  const byExp = d.experiences.map((e) => {
    const rs = d.reservations.filter((r) => r.experienceId === e.id && ["confirmed", "attended", "no_show"].includes(r.status));
    return { id: e.id, title: e.title.fr, bookings: rs.length, seats: rs.reduce((n, r) => n + r.seats, 0), present: rs.filter((r) => r.status === "attended").reduce((n, r) => n + r.seats, 0) };
  }).sort((a, b) => b.seats - a.seats);
  return (
    <>
      <PageHeader title="Statistiques" subtitle="Vos participants vous règlent le prix de l'activité sur place. Wenzy ne prend aucune commission : ses frais (35 DH) sont payés par le participant en ligne." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="pro-stats">
        <StatTile label="Réservations" value={String(s.bookings)} />
        <StatTile label="Dates à venir" value={String(s.upcomingSessions)} hint={`${s.upcomingSeats} places réservées`} />
        <StatTile label="Remplissage (à venir)" value={`${Math.round(s.fill * 100)} %`} />
        <StatTile label="Présents / absents" value={`${attended} / ${noShow}`} hint={`${past.length} date${past.length > 1 ? "s" : ""} passée${past.length > 1 ? "s" : ""}`} />
      </div>
      <Card title="Par activité" className="mt-6">
        <Table head={["Activité", "Réservations", "Places", "Présents"]} caption="Par activité">
          {byExp.map((x) => (
            <tr key={x.id}><td className="font-medium text-ink">{x.title}</td><td>{x.bookings}</td><td>{x.seats}</td><td>{x.present}</td></tr>
          ))}
        </Table>
        <p className="mt-3 text-xs text-muted">Le pointage se fait depuis « Pointage » (liste ou QR code) : il distingue les présents des absents. Taux d&apos;annulation : {Math.round(s.cancellationRate * 100)} %.</p>
      </Card>
    </>
  );
}
