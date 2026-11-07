import { CsvExportButton } from "@/components/admin/csv-export";
import { BarList, Card, DemoNote, dh, PageHeader, pct, StatTile, Table } from "@/components/admin/ui";
import { computeStats, getAdminData } from "@/lib/data/admin";

export const metadata = { title: "Statistiques" };

export default async function StatsAdminPage() {
  const d = await getAdminData();
  const s = computeStats(d);
  const csv = [["Univers", "CA brut (DH)", "Marge (DH)", "Réservations", "Remplissage"], ...s.byCategory.map((c) => [c.name, (c.gross / 100).toFixed(2), (c.margin / 100).toFixed(2), c.bookings, pct(c.fill)])];
  return (
    <>
      <PageHeader title="Statistiques" subtitle="Casablanca · sessions des 3 prochaines semaines" actions={<CsvExportButton filename="statistiques.csv" rows={csv} />} />
      <div className="mb-4"><DemoNote>Calculées à partir des données fictives. Statistiques détaillées par ville, univers et période : étape 7 du plan.</DemoNote></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label="CA brut" value={dh(s.gross)} />
        <StatTile label="Coûts / reversements" value={dh(s.cost)} />
        <StatTile label="Commissions" value={dh(s.commission)} />
        <StatTile label="Marge estimée" value={dh(s.margin)} hint={pct(s.gross ? s.margin / s.gross : 0)} />
        <StatTile label="Réservations" value={String(s.bookings)} hint={`${s.seatsSold} places`} />
        <StatTile label="Remplissage" value={pct(s.fill)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Marge par univers"><BarList items={s.byCategory.map((c) => ({ label: c.name, value: c.margin }))} format={dh} /></Card>
        <Card title="Taux de remplissage par univers"><BarList items={s.byCategory.map((c) => ({ label: c.name, value: Math.round(c.fill * 100) }))} format={(v) => `${v} %`} /></Card>
      </div>
      <Card title="Détail par univers" className="mt-6">
        <Table head={["Univers", "CA brut", "Marge", "Réservations", "Remplissage"]} caption="Détail par univers">
          {s.byCategory.map((c) => (
            <tr key={c.id}><td className="font-medium">{c.name}</td><td className="tabular-nums">{dh(c.gross)}</td><td className="tabular-nums">{dh(c.margin)}</td><td className="tabular-nums">{c.bookings}</td><td className="tabular-nums">{pct(c.fill)}</td></tr>
          ))}
        </Table>
      </Card>
      <Card title="Par ville" className="mt-6">
        <p className="text-sm text-muted">Casablanca : {dh(s.gross)} · Rabat, Marrakech, Tanger, Agadir : pas encore ouvertes.</p>
      </Card>
    </>
  );
}
