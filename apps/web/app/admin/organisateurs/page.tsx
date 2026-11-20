import { ORGANIZER_STATUS_LABELS } from "@thecommunity/shared";
import Link from "next/link";
import { ORGANIZER_STATUS_TONE as STATUS_TONE } from "@/components/admin/labels";
import { adminDate, Badge, Card, DemoNote, PageHeader, Table } from "@/components/admin/ui";
import { getAdminOrganizers } from "@/lib/data/admin-organizers";

export const metadata = { title: "Organisateurs" };


/** Étape 20 — organisateurs : demandes à valider, comptes validés, suspendus. */
export default async function OrganizersAdminPage() {
  const { organizers, isDemo } = await getAdminOrganizers();
  const todo = organizers.filter((o) => o.status === "pending").length;
  return (
    <>
      <PageHeader title="Organisateurs" subtitle={`${organizers.length} compte${organizers.length > 1 ? "s" : ""} · ${todo} demande${todo > 1 ? "s" : ""} à traiter. Les organisateurs s'inscrivent depuis /pro.`} />
      {isDemo && <div className="mb-4"><DemoNote>Démonstration : deux organisateurs d&apos;exemple. Sur le site en ligne, les demandes envoyées depuis /pro arrivent ici.</DemoNote></div>}
      <Card>
        {organizers.length === 0 ? (
          <p className="text-sm text-muted">Aucun organisateur pour l&apos;instant.</p>
        ) : (
          <Table head={["Organisateur", "Contact", "Statut", "Activités", "Demande", ""]}>
            {organizers.map((o) => (
              <tr key={o.id} data-testid="admin-organizer">
                <td className="font-medium text-ink">{o.name}</td>
                <td className="text-sm text-muted">{o.details?.contactName}<br />{o.details?.email}</td>
                <td><Badge tone={STATUS_TONE[o.status] ?? "gray"}>{ORGANIZER_STATUS_LABELS[o.status]}</Badge></td>
                <td>{o.activityCounts.published} en ligne{o.activityCounts.pending ? ` · ${o.activityCounts.pending} à relire` : ""}</td>
                <td className="whitespace-nowrap text-muted">{o.details?.submittedAt ? adminDate(o.details.submittedAt, false) : "—"}</td>
                <td className="text-end"><Link href={`/admin/organisateurs/${o.id}`} className="font-semibold text-plum-900">Ouvrir</Link></td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
