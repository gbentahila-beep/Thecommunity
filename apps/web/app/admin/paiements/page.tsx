import { Badge, Card, DemoNote, dh, PageHeader, StatTile, Table, adminDate } from "@/components/admin/ui";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { getAdminData } from "@/lib/data/admin";
import { FIREBASE_ENABLED } from "@/lib/firebase/config";

export const metadata = { title: "Paiements" };
const STATUS = { succeeded: ["Réussi", "green"], initiated: ["En attente", "amber"], failed: ["Échoué", "red"], refunded: ["Remboursé", "gray"] } as const;

export default async function PaymentsAdminPage() {
  const d = await getAdminData();
  const pays = [...d.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sum = (f: (p: (typeof pays)[number]) => boolean) => pays.filter(f).reduce((a, p) => a + p.amount, 0);
  return (
    <>
      <PageHeader title="Paiements et remboursements" />
      <div className="mb-4"><DemoNote>Paiements de test (« sandbox », aucun argent) ou virements bancaires (à valider dans « Virements »). Chaque paiement encaissé reçoit un document (série TEST tant que les paiements sont en test), envoyé par e-mail — voir la boîte d&apos;envoi.</DemoNote></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Encaissé" value={dh(sum((p) => p.type === "payment" && p.status !== "initiated"))} />
        <StatTile label="Remboursé" value={dh(sum((p) => p.type === "refund"))} />
        <StatTile label="En attente" value={dh(sum((p) => p.status === "initiated"))} />
        <StatTile label="Transactions" value={String(pays.length)} />
      </div>
      <Card className="mt-6">
        <Table head={["Date", "Type", "Réservation", "Membre", "Montant", "Statut", "Document", ...(FIREBASE_ENABLED ? [""] : [])]} caption="Transactions">
          {pays.slice(0, 200).map((p) => {
            const u = d.usersById.get(p.userId)!;
            return (
              <tr key={p.id}>
                <td className="whitespace-nowrap text-muted">{adminDate(p.createdAt)}</td>
                <td>{p.type === "payment" ? "Paiement" : "Remboursement"}{p.provider === "bank_transfer" && <span className="block text-xs text-muted">Virement{p.reference ? ` ${p.reference}` : ""}</span>}</td>
                <td className="font-mono text-xs">{p.reservationId}</td>
                <td>{u.firstName} {u.lastName}</td>
                <td className={`tabular-nums ${p.type === "refund" ? "text-red-800" : ""}`}>{p.type === "refund" ? "−" : ""}{dh(p.amount)}</td>
                <td><Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge></td>
                <td className="whitespace-nowrap">
                  {p.invoiceId ? (
                    <a href={`/api/factures/${p.invoiceId}`} className="font-mono text-xs text-plum-900 underline">{p.invoiceNumber}</a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                {FIREBASE_ENABLED && (
                  <td>{p.status !== "initiated" && p.status !== "failed" && <InvoiceActions paymentId={p.id} hasInvoice={Boolean(p.invoiceId)} />}</td>
                )}
              </tr>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
