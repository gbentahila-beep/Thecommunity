import { DEFAULT_COMMISSION_PERCENT, PAYOUT_DEADLINE_DAYS, resolveCommission } from "@thecommunity/shared";
import Link from "next/link";
import { adminDate, Badge, Card, dh, PageHeader, StatTile, Table } from "@/components/admin/ui";
import { BankForm } from "@/components/pro/bank-form";
import { getAllCategories } from "@/lib/data";
import { getOrganizerFinance, ledgerTotals } from "@/lib/data/finance";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Finances" };

/** Étape 21 — finances de l'organisateur : encaissé pour son compte, commission, à recevoir, reversements, RIB. */
export default async function ProFinancesPage() {
  const space = await requireApprovedOrganizer();
  const o = space.organizer;
  const [f, d, categories] = await Promise.all([getOrganizerFinance(o.id), getProData(o.id), getAllCategories()]);
  const t = ledgerTotals(f.ledger, f.now);
  const today = f.now.toISOString().slice(0, 10);
  const titles = new Map(d.experiences.map((e) => [e.id, e.title.fr]));
  const rates = o.categoryIds.map((c) => ({ c, r: resolveCommission(f.rules, { experienceId: "-", organizerId: o.id, categoryId: c, at: today }) }));
  const bank = space.details?.bank ? { holder: space.details.bank.holder, bankName: space.details.bank.bankName, ribLast4: space.details.bank.rib.slice(-4) } : null;
  return (
    <>
      <PageHeader title="Finances" subtitle={`Reversement par virement au plus tard ${PAYOUT_DEADLINE_DAYS} jours après chaque activité, commission déduite (contrat organisateur, art. 5 et 6).`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="pro-finance-kpis">
        <StatTile label="Payé en ligne par vos participants" value={dh(t.gross)} hint={t.refunds ? `${dh(t.refunds)} remboursés` : undefined} />
        <StatTile label="Commission The Host Club" value={dh(t.commission)} />
        <StatTile label="À recevoir" value={dh(t.due + t.inPayout)} hint={`dont ${dh(t.available)} pour des activités passées`} />
        <StatTile label="Déjà reçu" value={dh(t.paid)} />
      </div>
      <Card title="Votre commission" className="mt-6">
        <ul className="space-y-1 text-sm" data-testid="pro-rates">
          {rates.map(({ c, r }) => (
            <li key={c}>{categories.find((x) => x.id === c)?.name.fr ?? c} : <strong>{r.ratePercent} %</strong>{r.fixedPerSeat ? ` + ${dh(r.fixedPerSeat)} par place` : ""}{r.ruleId ? "" : ` (taux par défaut)`}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-muted">Taux copié sur chaque réservation au moment où elle est faite. Un nouveau taux est annoncé 30 jours à l&apos;avance. Taux par défaut : {DEFAULT_COMMISSION_PERCENT} %.</p>
      </Card>
      <Card title="Compte de reversement" className="mt-6">
        <BankForm current={bank} live={!space.isDemo} />
      </Card>
      <Card title="Reversements" className="mt-6">
        {f.payouts.length === 0 ? (
          <p className="text-sm text-muted">Aucun reversement pour l&apos;instant.</p>
        ) : (
          <Table head={["Date", "Réservations", "Montant", "État"]}>
            {f.payouts.map((p) => (
              <tr key={p.id} data-testid="pro-payout">
                <td>{adminDate(p.paidAt ?? p.createdAt, false)}</td>
                <td>{p.entries}</td>
                <td className="tabular-nums font-semibold">{dh(p.amount)}</td>
                <td>{p.status === "paid" ? <><Badge tone="green">Viré</Badge> <span className="text-xs text-muted">{p.reference}</span></> : <Badge tone="amber">En préparation</Badge>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Card title="Détail par réservation" className="mt-6">
        {f.ledger.length === 0 ? (
          <p className="text-sm text-muted">Aucune réservation payée pour l&apos;instant. Voir <Link href="/pro/reservations" className="underline">Réservations</Link>.</p>
        ) : (
          <Table head={["Date de l'activité", "Activité", "Type", "Payé", "Commission", "Pour vous", "État"]}>
            {f.ledger.map((l) => (
              <tr key={l.id} data-testid="pro-ledger">
                <td className="whitespace-nowrap">{l.sessionStartAt ? adminDate(l.sessionStartAt, false) : "—"}</td>
                <td>{titles.get(l.experienceId) ?? "—"}</td>
                <td>{l.kind === "sale" ? "Vente" : "Remboursement"} <span className="text-xs text-muted">({l.ratePercent} %)</span></td>
                <td className="tabular-nums">{dh(l.gross)}</td>
                <td className="tabular-nums">{dh(l.commission)}</td>
                <td className="tabular-nums font-medium">{dh(l.payable)}</td>
                <td><Badge tone={l.status === "paid" ? "green" : l.status === "in_payout" ? "plum" : "gray"}>{l.status === "paid" ? "Reversé" : l.status === "in_payout" ? "En virement" : "À recevoir"}</Badge></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
