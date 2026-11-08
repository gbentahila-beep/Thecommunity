import Link from "next/link";
import { CsvExportButton } from "@/components/admin/csv-export";
import { BarList, Card, DemoNote, dh, PageHeader, pct, StatTile, Table } from "@/components/admin/ui";
import { getAdminData } from "@/lib/data/admin";
import { getPeriodStats, PERIODS, type StatsPeriod } from "@/lib/data/admin-stats";

export const metadata = { title: "Statistiques" };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

export default async function StatsAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const period = (PERIODS.some((p) => p.key === sp.periode) ? sp.periode : "upcoming") as StatsPeriod;
  const d = await getAdminData();
  const s = await getPeriodStats(d, period);
  const label = PERIODS.find((p) => p.key === period)!.label;
  const csv = [
    ["Période", label],
    ["Univers", "CA brut (DH)", "Marge (DH)", "Réservations", "Remplissage"],
    ...s.byCategory.map((c) => [c.name, (c.gross / 100).toFixed(2), (c.margin / 100).toFixed(2), c.bookings, pct(c.fill)]),
    [],
    ["Mois", "Réservations", "CA brut (DH)"],
    ...s.byMonth.map((m) => [monthLabel(m.month), m.bookings, (m.gross / 100).toFixed(2)]),
  ];
  return (
    <>
      <PageHeader title="Statistiques" subtitle={`Casablanca · ${label.toLowerCase()} (date de l'expérience)`} actions={<CsvExportButton filename={`statistiques-${period}.csv`} rows={csv} />} />
      <nav aria-label="Période" className="mb-4 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={p.key === "upcoming" ? "/admin/statistiques" : `/admin/statistiques?periode=${p.key}`}
            aria-current={p.key === period ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium ${p.key === period ? "bg-plum-900 text-white" : "bg-white text-ink hover:bg-cream"}`}
          >
            {p.label}
          </Link>
        ))}
      </nav>
      {d.isDemo && <div className="mb-4"><DemoNote>Calculées à partir des données fictives de démonstration.</DemoNote></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        <StatTile label="CA brut" value={dh(s.gross)} hint={s.refunds ? `remboursé : ${dh(s.refunds)}` : undefined} />
        <StatTile label="Marge estimée" value={dh(s.margin)} hint={pct(s.gross ? s.margin / s.gross : 0)} />
        <StatTile label="Réservations" value={String(s.bookings)} hint={`${s.seatsSold} places · ${s.people} personnes`} />
        <StatTile label="Remplissage" value={pct(s.fill)} hint={`${s.sessions} dates`} />
        <StatTile label="Membres fidèles" value={pct(s.returningRate)} hint="2 réservations ou plus" />
        <StatTile label="Note moyenne" value={s.rating !== null ? `${s.rating.toFixed(1)} / 5` : "—"} hint={`${s.ratingCount} avis`} />
        <StatTile label="Annulations" value={pct(s.cancelRate)} />
        <StatTile label="Absences" value={s.noShowRate !== null ? pct(s.noShowRate) : "—"} hint="dates pointées" />
        <StatTile label="Avec code promo" value={String(s.promoBookings)} hint="réservations" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Chiffre d'affaires par univers"><BarList items={s.byCategory.map((c) => ({ label: c.name, value: c.gross }))} format={dh} /></Card>
        <Card title="Remplissage par univers"><BarList items={s.byCategory.map((c) => ({ label: c.name, value: Math.round(c.fill * 100) }))} format={(v) => `${v} %`} /></Card>
      </div>
      <Card title="Par mois" className="mt-6">
        {s.byMonth.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation sur cette période.</p>
        ) : (
          <Table head={["Mois", "Réservations", "CA brut"]} caption="Par mois">
            {s.byMonth.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td className="tabular-nums">{m.bookings}</td><td className="tabular-nums">{dh(m.gross)}</td></tr>)}
          </Table>
        )}
      </Card>
      <Card title="Détail par univers" className="mt-6">
        <Table head={["Univers", "CA brut", "Marge", "Réservations", "Remplissage"]} caption="Détail par univers">
          {s.byCategory.map((c) => (
            <tr key={c.id}><td className="font-medium">{c.name}</td><td className="tabular-nums">{dh(c.gross)}</td><td className="tabular-nums">{dh(c.margin)}</td><td className="tabular-nums">{c.bookings}</td><td className="tabular-nums">{pct(c.fill)}</td></tr>
          ))}
        </Table>
      </Card>
      <p className="mt-4 text-xs text-muted">Les autres villes apparaîtront ici dès leur ouverture. Absences : calculées sur les dates où le pointage a été fait.</p>
    </>
  );
}
