import { RefundDecision } from "@/components/admin/refund-actions";
import { adminDate, Badge, Card, DemoNote, dh, PageHeader } from "@/components/admin/ui";
import { getAdminRefundRequests } from "@/lib/data/admin-refunds";

export const metadata = { title: "Remboursements" };

const REASONS: Record<string, string> = {
  not_delivered: "L'activité n'a pas eu lieu",
  different: "Très différente de la description",
  cancelled_by_organizer: "Annulée par l'organisateur sur place",
  safety: "Problème de sécurité",
  other: "Autre",
};
const STATUS: Record<string, [string, "green" | "amber" | "gray"]> = {
  refunded: ["Remboursée", "green"],
  partially_refunded: ["Remboursée en partie", "green"],
  declined: ["Refusée", "gray"],
};

/** Étape 22 — demandes de remboursement des participants : décision de l'équipe (après avoir entendu l'organisateur). */
export default async function RefundsPage() {
  const { pending, decided, isDemo } = await getAdminRefundRequests();
  return (
    <>
      <PageHeader title="Remboursements" subtitle={`${pending.length} demande${pending.length > 1 ? "s" : ""} à traiter. Jamais plus que ce qui a été payé en ligne et pas encore remboursé.`} />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : une demande d&apos;exemple.</DemoNote></div>}
      {pending.length === 0 ? (
        <Card><p className="text-sm text-muted">Aucune demande en attente. Les participants peuvent en faire une depuis leur réservation, jusqu&apos;à 7 jours après l&apos;activité.</p></Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((x) => {
            const max = Math.max(0, x.paidAmount - x.refundedSoFar);
            return (
              <li key={x.id} className="rounded-2xl bg-white p-5 shadow-card" data-testid="refund-request-admin">
                <p className="font-semibold text-ink">{x.userName} · {x.title}</p>
                <p className="text-sm text-muted">Activité du {adminDate(x.sessionStartAt, false)} · payé en ligne {dh(x.paidAmount)}{x.refundedSoFar ? ` · déjà remboursé ${dh(x.refundedSoFar)}` : ""}{x.organizerId ? " · activité d'un organisateur" : ""}</p>
                <p className="mt-2 text-sm"><Badge tone="amber">{REASONS[x.reason] ?? x.reason}</Badge></p>
                <p className="mt-2 whitespace-pre-line text-[15px] text-ink/90">« {x.message} »</p>
                <div className="mt-3"><RefundDecision requestId={x.id} maxDh={max / 100} live={!isDemo} /></div>
              </li>
            );
          })}
        </ul>
      )}
      {decided.length > 0 && (
        <Card title="Déjà traitées" className="mt-6">
          <ul className="divide-y divide-line text-sm">
            {decided.map((x) => {
              const st = STATUS[x.status] ?? [x.status, "gray"];
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
                  <Badge tone={st[1]}>{st[0]}</Badge>
                  <span className="font-medium">{x.userName}</span>
                  <span className="text-muted">· {x.title}{x.amount ? ` · ${dh(x.amount)}` : ""}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
