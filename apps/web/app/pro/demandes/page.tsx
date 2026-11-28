import { RequestActions } from "@/components/admin/request-actions";
import { adminDate, Badge, Card, PageHeader } from "@/components/admin/ui";
import { getProData, requireApprovedOrganizer } from "@/lib/data/organizer";

export const metadata = { title: "Demandes de participation" };

/** Étape 20 — demandes de participation (activités « sur demande ») : l'organisateur accepte ou refuse. */
export default async function ProRequestsPage() {
  const space = await requireApprovedOrganizer();
  const d = await getProData(space.organizer.id);
  const pending = d.requests.filter((r) => r.status === "pending");
  const decided = d.requests.filter((r) => r.status !== "pending").slice(-30).reverse();
  return (
    <>
      <PageHeader title="Demandes de participation" subtitle="Personne acceptée : sa place est bloquée 24 h pour payer. Refus : la personne est prévenue, sans motif public." />
      {pending.length === 0 ? (
        <Card><p className="text-sm text-muted">Aucune demande en attente. Les demandes arrivent ici pour vos activités « sur demande ».</p></Card>
      ) : (
        <ul className="space-y-4">
          {pending.map((r) => (
            <li key={r.id} className="rounded-2xl bg-white p-5 shadow-card" data-testid="pro-request">
              <p className="font-semibold text-ink">{r.participant} · {r.seats} place{r.seats > 1 ? "s" : ""}</p>
              <p className="text-sm text-muted">{r.title} · {adminDate(r.startAt)} · demande du {adminDate(r.createdAt, false)}</p>
              {r.message && <p className="mt-2 whitespace-pre-line text-[15px] text-ink/90">« {r.message} »</p>}
              {r.instagram && <p className="mt-1 text-sm text-muted">Instagram : @{r.instagram}</p>}
              <div className="mt-3">{space.isDemo ? <p className="text-xs text-muted">Démonstration : action désactivée.</p> : <RequestActions requestId={r.id} name={r.participant} />}</div>
            </li>
          ))}
        </ul>
      )}
      {decided.length > 0 && (
        <Card title="Déjà traitées" className="mt-6">
          <ul className="divide-y divide-line text-sm">
            {decided.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <Badge tone={r.status === "accepted" ? "green" : "gray"}>{r.status === "accepted" ? "Acceptée" : r.status === "declined" ? "Refusée" : "Close"}</Badge>
                <span className="font-medium">{r.participant}</span>
                <span className="text-muted">· {r.title} · {adminDate(r.startAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
