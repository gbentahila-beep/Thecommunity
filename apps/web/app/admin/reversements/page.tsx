import { CreatePayoutButton, MarkPayoutPaid } from "@/components/admin/finance-actions";
import { adminDate, Badge, Card, DemoNote, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { getAdminOrganizers } from "@/lib/data/admin-organizers";
import { getAdminFinance, ledgerTotals } from "@/lib/data/finance";

export const metadata = { title: "Reversements" };

/**
 * Étape 21 — comptabilité des activités des organisateurs : volume encaissé pour leur compte, commissions,
 * remboursements, à reverser ; reversements à préparer et à marquer « virés ».
 */
export default async function PayoutsPage() {
  const [{ ledger, payouts, isDemo, now }, { organizers }] = await Promise.all([getAdminFinance(), getAdminOrganizers()]);
  const t = ledgerTotals(ledger, now);
  const names = new Map(organizers.map((o) => [o.id, o.name]));
  const byOrg = organizers
    .map((o) => ({ o, t: ledgerTotals(ledger.filter((l) => l.organizerId === o.id), now) }))
    .filter((x) => x.t.gross > 0 || x.t.due !== 0);
  return (
    <>
      <PageHeader title="Reversements" subtitle="Sommes encaissées pour le compte des organisateurs, commissions et reversements (au plus tard 15 jours après l'activité)." />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : registre calculé à partir des réservations du padel (Club Padel Anfa).</DemoNote></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="finance-kpis">
        <StatTile label="Volume organisateurs" value={dh(t.gross)} hint="Payé en ligne pour leurs activités" />
        <StatTile label="Commissions" value={dh(t.commission)} hint="Revenu de Wenzy" />
        <StatTile label="Remboursements" value={dh(t.refunds)} />
        <StatTile label="À reverser" value={dh(t.due + t.inPayout)} hint={`dont ${dh(t.available)} disponibles`} />
        <StatTile label="Déjà reversé" value={dh(t.paid)} />
      </div>
      <Card title="Par organisateur" className="mt-6">
        {byOrg.length === 0 ? (
          <p className="text-sm text-muted">Aucune vente d&apos;organisateur pour l&apos;instant.</p>
        ) : (
          <Table head={["Organisateur", "Volume", "Commission", "Dû", "Disponible", "RIB", ""]}>
            {byOrg.map(({ o, t: x }) => (
              <tr key={o.id} data-testid="payout-organizer">
                <td className="font-medium text-ink">{o.name}</td>
                <td className="tabular-nums">{dh(x.gross)}</td>
                <td className="tabular-nums">{dh(x.commission)}</td>
                <td className="tabular-nums">{dh(x.due)}</td>
                <td className="tabular-nums">{dh(x.available)}</td>
                <td>{o.details?.bank?.rib ? `•••• ${o.details.bank.rib.slice(-4)}` : <Badge tone="amber">manquant</Badge>}</td>
                <td className="text-end"><CreatePayoutButton organizerId={o.id} live={!isDemo} disabled={x.available <= 0} /></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Reversements" className="mt-6">
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">Aucun reversement.</p>
        ) : (
          <Table head={["Préparé le", "Organisateur", "Réservations", "Montant", "Compte", "État"]}>
            {payouts.map((p) => (
              <tr key={p.id} data-testid="payout">
                <td className="whitespace-nowrap">{adminDate(p.createdAt, false)}</td>
                <td>{names.get(p.organizerId) ?? p.organizerId}</td>
                <td>{p.entries}</td>
                <td className="tabular-nums font-semibold">{dh(p.amount)}</td>
                <td className="text-sm text-muted">{p.bank ? `${p.bank.holder} · ${p.bank.bankName} · •••• ${p.bank.ribLast4}` : "—"}</td>
                <td>{p.status === "paid" ? <span className="text-sm"><Badge tone="green">Viré</Badge> {p.reference} {p.paidAt ? `· ${adminDate(p.paidAt, false)}` : ""}</span> : <MarkPayoutPaid payoutId={p.id} live={!isDemo} />}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
