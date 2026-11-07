import { Badge, Card, DemoNote, PageHeader, Table, adminDate } from "@/components/admin/ui";
import { getAdminData, getDataRequests } from "@/lib/data/admin";

export const metadata = { title: "Demandes 09-08" };

/** Demandes d'export et de suppression de données (loi 09-08) à traiter par l'équipe. */
export default async function DataRequestsPage() {
  const d = await getAdminData();
  const requests = await getDataRequests();
  return (
    <>
      <PageHeader title="Demandes loi 09-08" subtitle="Suppressions de compte et exports demandés par les membres" />
      <div className="mb-4">
        <DemoNote>
          Délai à respecter et procédure exacte à valider avec votre conseil juridique. Le traitement automatique (suppression du profil, anonymisation des réservations) sera ajouté ; en attendant, l&apos;équipe traite chaque demande.
        </DemoNote>
      </div>
      <Card>
        {requests.length === 0 ? (
          <p className="text-sm text-muted">{d.isDemo ? "Mode démonstration : aucune demande." : "Aucune demande pour le moment."}</p>
        ) : (
          <Table head={["Reçue le", "Membre", "Type", "Statut"]} caption="Demandes">
            {requests.map((r) => {
              const u = d.usersById.get(r.userId);
              return (
                <tr key={r.id}>
                  <td className="whitespace-nowrap text-muted">{adminDate(r.createdAt)}</td>
                  <td>{u ? <><span className="block font-medium">{u.firstName} {u.lastName}</span><span className="text-xs text-muted">{u.email}</span></> : <span className="font-mono text-xs">{r.userId}</span>}</td>
                  <td>{r.type === "deletion" ? "Suppression du compte" : "Export des données"}</td>
                  <td><Badge tone={r.status === "pending" ? "amber" : "green"}>{r.status === "pending" ? "À traiter" : "Traitée"}</Badge></td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </>
  );
}
